import { sql } from "@payloadcms/db-postgres";
import type { Payload } from "payload";

import { stockholmDate } from "./ethiopian-calendar";

/** "INQ-2026-0042": prefix, year (Stockholm) and a number counting from 1 each year. */
export function formatReference(prefix: string, year: number, n: number): string {
  return `${prefix}-${year}-${String(n).padStart(4, "0")}`;
}

/**
 * Next reference for a prefix (spec §2.12/§2.14: yearly sequence). Uses one Postgres sequence per
 * prefix and year, so two requests at the same moment never get the same number; numbers that a
 * failed save used are skipped, never reused.
 */
export async function nextReference(payload: Payload, prefix: "INQ" | "BAP", now = new Date()): Promise<string> {
  if (!/^[A-Z]{3}$/.test(prefix)) throw new Error("Invalid reference prefix");
  const year = stockholmDate(now).year;
  const sequence = `ref_${prefix.toLowerCase()}_${year}`;
  const db = (payload.db as unknown as { drizzle: { execute: (query: unknown) => Promise<{ rows: { n: string }[] }> } }).drizzle;
  await db.execute(sql.raw(`CREATE SEQUENCE IF NOT EXISTS "${sequence}"`));
  const result = await db.execute(sql.raw(`SELECT nextval('"${sequence}"') AS n`));
  return formatReference(prefix, year, Number(result.rows[0].n));
}
