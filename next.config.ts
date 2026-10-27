import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // The Docker image uses the minimal standalone server (set in the Dockerfile). Local and CI builds
  // keep the normal output, which avoids pnpm symlink copying issues on Windows.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  // `pnpm dev` only: extra hosts allowed to load dev assets, e.g. testing on a phone over the LAN
  // (DEV_ALLOWED_ORIGINS=192.168.10.187). No effect on production builds.
  allowedDevOrigins: process.env.DEV_ALLOWED_ORIGINS?.split(",").map((origin) => origin.trim()),
};

const config = withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false });

/**
 * Payload sends `Critical-CH: Sec-CH-Prefers-Color-Scheme` (plus Accept-CH/Vary) on every path for
 * its admin theme. On the public site that makes Chrome load each first page twice (a retry with
 * the hint, ~0.6 s on a slow phone connection, found by Lighthouse in task 10) and splits caches by
 * colour scheme. Keep that rule for the admin only.
 */
export default {
  ...config,
  headers: async () => [
    ...(await config.headers!()).map((rule) =>
      rule.source === "/:path*" && rule.headers.some((h) => h.key === "Critical-CH") ? { ...rule, source: "/admin/:path*" } : rule,
    ),
    // Self-hosted Ethiopic fonts (D-025): versioned file names, so they can be cached for a year.
    { source: "/fonts/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
  ],
} satisfies NextConfig;
