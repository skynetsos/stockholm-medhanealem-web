import { sql } from "@payloadcms/db-postgres";
import type { Payload, PayloadRequest } from "payload";

import { stockholmDate } from "./ethiopian-calendar";

/** "INQ-2026-0042": prefix, year (Stockholm) and a number counting from 1 each year. */
export function formatReference(prefix: string, year: number, n: number): string {
  return `${prefix}-${year}-${String(n).padStart(4, "0")}`;
}

/** Where each prefix's references are stored. */
const REFERENCE_TABLES = { INQ: "inquiries", BAP: "baptism_requests" } as const;
export type ReferencePrefix = keyof typeof REFERENCE_TABLES;

type Executor = { execute: (query: unknown) => Promise<{ rows: Record<string, unknown>[] }> };
type Drizzle = Executor & { transaction: <T>(run: (tx: Executor) => Promise<T>) => Promise<T> };
type Adapter = { drizzle: Drizzle; sessions?: Record<string | number, { db?: Executor } | undefined> };

/**
 * Next reference for a prefix (spec §2.12/§2.14: yearly sequence, D-034). Atomic:
 * - It runs on the saving request's own transaction (`req`), or in a short transaction of its own,
 *   so it never needs a second pool connection while the save holds one. Twenty simultaneous
 *   submissions used to hang the app once the pool ran out.
 * - A transaction-level advisory lock per prefix and year serialises reference generation until
 *   the save commits, so creating the year's sequence and the restart recovery below can't race,
 *   and the next request sees the previous one's row.
 * - The number comes from a Postgres sequence per prefix and year. Numbers used by a failed save
 *   are skipped, never reused.
 *
 * Payload's development schema sync (dev server and tests; never production, which runs
 * migrations) drops sequences it doesn't know. A sequence that restarted below the highest stored
 * reference continues from there instead of handing out a number already in use.
 */
export async function nextReference(payload: Payload, prefix: ReferencePrefix, now = new Date(), req?: Partial<PayloadRequest>): Promise<string> {
  if (!(prefix in REFERENCE_TABLES)) throw new Error("Invalid reference prefix");
  const year = stockholmDate(now).year;
  const sequence = `ref_${prefix.toLowerCase()}_${year}`;
  const adapter = payload.db as unknown as Adapter;

  const generate = async (db: Executor) => {
    await db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${sequence}))`);
    await db.execute(sql.raw(`CREATE SEQUENCE IF NOT EXISTS "${sequence}"`));
    const n = Number((await db.execute(sql.raw(`SELECT nextval('"${sequence}"') AS n`))).rows[0].n);
    const highest = await db.execute(
      sql.raw(`SELECT max(split_part(reference, '-', 3)::int) AS n FROM "${REFERENCE_TABLES[prefix]}" WHERE reference LIKE '${prefix}-${year}-%'`),
    );
    const max = Number(highest.rows[0].n ?? 0);
    if (n > max) return formatReference(prefix, year, n);
    await db.execute(sql.raw(`SELECT setval('"${sequence}"', ${max + 1})`));
    return formatReference(prefix, year, max + 1);
  };

  // The save's transaction, as Payload's own getTransaction finds it (@payloadcms/drizzle).
  const transaction = req?.transactionID ? adapter.sessions?.[await req.transactionID]?.db : undefined;
  return transaction ? generate(transaction) : adapter.drizzle.transaction(generate);
}
