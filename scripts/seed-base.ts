/**
 * Base content for Site settings, Navigation and Footer (docs/DECISIONS.md D-006).
 *
 *   pnpm seed:base                 fills only globals that are still empty (safe to re-run)
 *   SEED_FORCE=1 pnpm seed:base    overwrites them with the seed values
 *   (PowerShell: $env:SEED_FORCE="1"; pnpm seed:base)
 */
import { getPayload } from "payload";

import config from "../src/payload.config";
import { seedBase } from "../src/seed/base";

const force = process.env.SEED_FORCE === "1";
const payload = await getPayload({ config });
const report = await seedBase(payload, { force });

for (const [global, outcome] of Object.entries(report)) {
  console.log(`${global.padEnd(14)} ${outcome}`);
}
if (Object.values(report).some((outcome) => outcome !== "seeded") && !force) {
  console.log("\nGlobals with existing content were left unchanged. Use SEED_FORCE=1 to overwrite them.");
}
console.log("\nThe site caches header/footer for up to 5 minutes; restart `pnpm dev` to see changes at once.");
process.exit(0);
