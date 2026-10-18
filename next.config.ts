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

export default withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false });
