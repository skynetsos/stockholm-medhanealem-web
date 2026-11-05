import config from "@payload-config";
import { getPayload } from "payload";

import { runRetention } from "@/lib/cases/retention";
import { cronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * POST /api/cron/retention — the daily retention job (spec Phase 2 task 8, D-035), called by the
 * server's cron with `Authorization: Bearer <CRON_SECRET>`. Archives old closed baptism cases and
 * inquiries. `?dryRun=1` only reports what would be archived. The report lists references and
 * dates, never personal data.
 */
export async function POST(request: Request) {
  const auth = cronAuth(request.headers);
  if (auth === "unconfigured") return json({ error: "CRON_SECRET is not set on the server." }, 503);
  if (auth === "unauthorized") return json({ error: "Unauthorized" }, 401);

  const dryRun = ["1", "true"].includes(new URL(request.url).searchParams.get("dryRun") ?? "");
  const payload = await getPayload({ config });
  try {
    const report = await runRetention(payload, { dryRun });
    const results = report.results.map(({ collection, months, cutoff, cases }) => ({
      collection,
      months,
      cutoff,
      cases: cases.map(({ reference, status, closedAt }) => ({ reference, status, closedAt })),
    }));
    payload.logger.info({ msg: "Retention job", dryRun, archived: results.map((r) => `${r.collection}: ${r.cases.map((c) => c.reference).join(", ") || "none"}`) });
    return json({ dryRun, results });
  } catch (error) {
    payload.logger.error({ msg: "Retention job failed", error: String(error) });
    return json({ error: "The retention job failed; see the server log." }, 500);
  }
}
