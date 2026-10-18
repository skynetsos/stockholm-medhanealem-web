import path from "path";
import { fileURLToPath } from "url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";
import { buildConfig } from "payload";
import sharp from "sharp";

import { Users } from "./collections/Users";
import { Footer } from "./globals/Footer";
import { Navigation } from "./globals/Navigation";
import { SiteSettings } from "./globals/SiteSettings";
import { adminTranslations } from "./i18n/admin";
import { migrations } from "./migrations";
import { defaultLocale, localeNames, locales } from "./i18n/locales";
import { requireEnv } from "./lib/env";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  serverURL: requireEnv("NEXT_PUBLIC_SERVER_URL"),
  secret: requireEnv("PAYLOAD_SECRET"),
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      views: {
        mfa: {
          Component: "/components/admin/mfa/MfaView#MfaView",
          path: "/mfa",
        },
      },
    },
  },
  i18n: {
    translations: adminTranslations,
  },
  collections: [Users],
  globals: [SiteSettings, Navigation, Footer],
  localization: {
    locales: locales.map((code) => ({ code, label: localeNames[code] })),
    defaultLocale,
    fallback: true,
  },
  editor: lexicalEditor(),
  db: postgresAdapter({
    pool: {
      connectionString: requireEnv("DATABASE_URI"),
    },
    // Development syncs the schema automatically ("push"). Production never does: it applies these
    // versioned migrations on startup. After any schema change: `pnpm payload migrate:create <name>`.
    prodMigrations: migrations,
  }),
  plugins: [
    s3Storage({
      // Upload collections are added here as they are created (Media in Phase 1).
      collections: {},
      bucket: requireEnv("S3_BUCKET"),
      config: {
        endpoint: requireEnv("S3_ENDPOINT"),
        region: requireEnv("S3_REGION"),
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
        credentials: {
          accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
          secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
        },
      },
    }),
  ],
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  sharp,
});
