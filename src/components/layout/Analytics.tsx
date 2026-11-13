import { headers } from "next/headers";

import { analyticsConfig } from "@/lib/security/csp";

/**
 * Plausible (cookieless, no personal data) — only when PLAUSIBLE_DOMAIN is set; OFF by default
 * (D-044). The script carries the page's CSP nonce, and the policy allows it to report to the
 * Plausible server (connect-src) only in that case.
 */
export async function Analytics() {
  const config = analyticsConfig();
  if (!config) return null;
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <script defer data-domain={config.domain} src={config.script} nonce={nonce} />;
}
