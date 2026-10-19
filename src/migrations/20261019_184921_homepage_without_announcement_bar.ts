import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "homepage_sections" ALTER COLUMN "section" SET DATA TYPE text;
  -- The urgent bar is now on every page, not a home section (D-016): drop saved rows for it.
  DELETE FROM "homepage_sections" WHERE "section" = 'announcementBar';
  DROP TYPE "public"."enum_homepage_sections_section";
  CREATE TYPE "public"."enum_homepage_sections_section" AS ENUM('hero', 'nextService', 'upcomingHolyDays', 'latestNotice', 'about', 'sundaySchool', 'gallery', 'visit');
  ALTER TABLE "homepage_sections" ALTER COLUMN "section" SET DATA TYPE "public"."enum_homepage_sections_section" USING "section"::"public"."enum_homepage_sections_section";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_homepage_sections_section" ADD VALUE 'announcementBar' BEFORE 'hero';`)
}
