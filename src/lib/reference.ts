import { sql } from "@payloadcms/db-postgres";
import type { Payload } from "payload";

import { stockholmDate } from "./ethiopian-calendar";

/** "INQ-2026-0042": prefix, year (Stockholm) and a number counting from 1 each year. */
export function formatReference(prefix: string, year: number, n: number): string {
  return `${prefix}-${year}-${String(n).padStart(4, "0")}`;
}

/** Where each prefix's references are stored. */
const REFERENCE_TABLES = { INQ: "inquiries", BAP: "baptism_requests" } as const;

/**
 * Next reference for a prefix (spec §2.12/§2.14: yearly sequence). Uses one Postgres sequence per
 * prefix and year, so two requests at the same moment never get the same number; numbers that a
 * failed save used are skipped, never reused.
 *
 * Payload's development schema sync (dev server and tests; never production, which runs
 * migrations) drops sequences it doesn't know, so a sequence that restarted below the highest
 * stored reference continues from there instead of handing out a number already in use.
 */
export async function nextReference(payload: Payload, prefix: keyof typeof REFERENCE_TABLES, now = new Date()): Promise<string> {
  if (!/^[A-Z]{3}$/.test(prefix) || !(prefix in REFERENCE_TABLES)) throw new Error("Invalid reference prefix");
  const year = stockholmDate(now).year;
  const sequence = `ref_${prefix.toLowerCase()}_${year}`;
  const db = (payload.db as unknown as { drizzle: { execute: (query: unknown) => Promise<{ rows: { n: string | null }[] }> } }).drizzle;
  await db.execute(sql.raw(`CREATE SEQUENCE IF NOT EXISTS "${sequence}"`));
  const n = Number((await db.execute(sql.raw(`SELECT nextval('"${sequence}"') AS n`))).rows[0].n);
  const highest = await db.execute(
    sql.raw(
      `SELECT max(split_part(reference, '-', 3)::int) AS n FROM "${REFERENCE_TABLES[prefix]}" WHERE reference LIKE '${prefix}-${year}-%'`,
    ),
  );
  const max = Number(highest.rows[0].n ?? 0);
  if (n > max) return formatReference(prefix, year, n);
  await db.execute(sql.raw(`SELECT setval('"${sequence}"', ${max + 1})`));
  return formatReference(prefix, year, max + 1);
}
