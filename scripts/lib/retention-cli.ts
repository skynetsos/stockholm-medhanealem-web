import { getPayload } from "payload";

import config from "../../src/payload.config";
import { runRetention } from "../../src/lib/baptism/retention";

/**
 * The retention job from the command line (D-035), same as POST /api/cron/retention. Two separate
 * commands rather than a flag: `payload run` doesn't pass arguments on, and a dry run must never
 * archive by accident.
 */
export async function retentionCli(dryRun: boolean) {
  const payload = await getPayload({ config });
  const report = await runRetention(payload, { dryRun });
  console.log(`${dryRun ? "Dry run: would archive" : "Archived"} ${report.cases.length} case(s) closed before ${report.cutoff} (${report.months} months).`);
  for (const c of report.cases) console.log(`  ${c.reference}  ${c.status}  closed ${c.closedAt}`);
  process.exit(0);
}
