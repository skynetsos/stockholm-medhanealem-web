import path from "path";
import { fileURLToPath } from "url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";
import { buildConfig } from "payload";
import sharp from "sharp";

import { Announcements } from "./collections/Announcements";
import { Clergy } from "./collections/Clergy";
import { Departments } from "./collections/Departments";
import { Events } from "./collections/Events";
import { Galleries } from "./collections/Galleries";
import { Media } from "./collections/Media";
import { Pages } from "./collections/Pages";
import { Posts } from "./collections/Posts";
import { Teachings } from "./collections/Teachings";
import { Users } from "./collections/Users";
import { Videos } from "./collections/Videos";
import { Footer } from "./globals/Footer";
import { Homepage } from "./globals/Homepage";
import { Navigation } from "./globals/Navigation";
import { SiteSettings } from "./globals/SiteSettings";
import { adminTranslations } from "./i18n/admin";
import { migrations } from "./migrations";
import { defaultLocale, localeNames, locales } from "./i18n/locales";
import { STOCKHOLM_TIMEZONE } from "./fields/stockholmDate";
import { requireEnv } from "./lib/env";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  serverURL: requireEnv("NEXT_PUBLIC_SERVER_URL"),
  secret: requireEnv("PAYLOAD_SECRET"),
  admin: {
    user: Users.slug,
    // Everything is entered and shown in Stockholm time (stored as UTC).
    timezones: { supportedTimezones: [STOCKHOLM_TIMEZONE], defaultTimezone: STOCKHOLM_TIMEZONE.value },
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
  collections: [Users, Media, Pages, Teachings, Events, Announcements, Clergy, Departments, Galleries, Videos, Posts],
  globals: [SiteSettings, Navigation, Footer, Homepage],
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
      // Files are served through Payload (/api/media/file/...), so Media's read access applies to them.
      collections: { media: true },
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
