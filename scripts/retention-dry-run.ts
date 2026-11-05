// pnpm retention:dry-run: list the baptism cases and inquiries the retention job would archive; changes nothing (D-035).
import { retentionCli } from "./lib/retention-cli";

await retentionCli(true);
