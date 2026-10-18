/* Payload GraphQL API (based on the Payload 3 blank template). */
import config from "@payload-config";
import { GRAPHQL_POST, REST_OPTIONS } from "@payloadcms/next/routes";

export const POST = GRAPHQL_POST(config);

export const OPTIONS = REST_OPTIONS(config);
