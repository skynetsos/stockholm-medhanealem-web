import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // The Docker image uses the minimal standalone server (set in the Dockerfile). Local and CI builds
  // keep the normal output, which avoids pnpm symlink copying issues on Windows.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
};

export default withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false });
