// pnpm retention: archive old closed baptism cases and inquiries now (D-035). Try `pnpm retention:dry-run` first.
import { retentionCli } from "./lib/retention-cli";

await retentionCli(false);
