import { getPayload } from "payload";

import config from "../../src/payload.config";
import { runRetention } from "../../src/lib/cases/retention";

/**
 * The retention job from the command line (D-035), same as POST /api/cron/retention. Two separate
 * commands rather than a flag: `payload run` doesn't pass arguments on, and a dry run must never
 * archive by accident.
 */
export async function retentionCli(dryRun: boolean) {
  const payload = await getPayload({ config });
  const report = await runRetention(payload, { dryRun });
  for (const { collection, months, cutoff, cases } of report.results) {
    console.log(`${collection}: ${dryRun ? "would archive" : "archived"} ${cases.length} closed before ${cutoff} (${months} months).`);
    for (const c of cases) console.log(`  ${c.reference}  ${c.status}  closed ${c.closedAt}`);
  }
  if (dryRun) console.log("Dry run: nothing was changed.");
  process.exit(0);
}
