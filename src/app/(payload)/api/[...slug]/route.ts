/* Payload REST API (based on the Payload 3 blank template). */
import config from "@payload-config";
import "@payloadcms/next/css";
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from "@payloadcms/next/routes";

import { mediaCacheControl } from "@/lib/media-cache";

const payloadGet = REST_GET(config);

/** Payload's GET, plus long caching for public media files (src/lib/media-cache.ts). */
export const GET: typeof payloadGet = async (request, context) => {
  const response = await payloadGet(request, context);
  const cacheControl = mediaCacheControl(new URL(request.url).pathname, request.headers, response.status);
  if (cacheControl) response.headers.set("Cache-Control", cacheControl);
  return response;
};
export const POST = REST_POST(config);
export const DELETE = REST_DELETE(config);
export const PATCH = REST_PATCH(config);
export const PUT = REST_PUT(config);
export const OPTIONS = REST_OPTIONS(config);
