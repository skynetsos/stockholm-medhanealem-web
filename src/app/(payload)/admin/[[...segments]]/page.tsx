/* Payload admin catch-all page (based on the Payload 3 blank template). */
import type { Metadata } from "next";

import config from "@payload-config";
import { generatePageMetadata, RootPage } from "@payloadcms/next/views";

import { enforceAdminMfa } from "@/lib/mfa/gate.server";
import { importMap } from "../importMap.js";

type Args = {
  params: Promise<{
    segments: string[];
  }>;
  searchParams: Promise<{
    [key: string]: string | string[];
  }>;
};

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams });

const Page = async ({ params, searchParams }: Args) => {
  // Privileged roles must complete MFA for this session before any other admin screen.
  await enforceAdminMfa((await params).segments);
  return RootPage({ config, params, searchParams, importMap });
};

export default Page;
