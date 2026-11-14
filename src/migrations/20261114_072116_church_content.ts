import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_pages_section" ADD VALUE 'sacraments' BEFORE 'support';
  ALTER TYPE "public"."enum__pages_v_version_section" ADD VALUE 'sacraments' BEFORE 'support';
  ALTER TYPE "public"."enum_teachings_category" ADD VALUE 'offerings';
  ALTER TYPE "public"."enum__teachings_v_version_category" ADD VALUE 'offerings';
  ALTER TABLE "pages" ADD COLUMN "content_key" varchar;
  ALTER TABLE "_pages_v" ADD COLUMN "version_content_key" varchar;
  ALTER TABLE "teachings" ADD COLUMN "content_key" varchar;
  ALTER TABLE "_teachings_v" ADD COLUMN "version_content_key" varchar;
  ALTER TABLE "events" ADD COLUMN "content_key" varchar;
  CREATE UNIQUE INDEX "pages_content_key_idx" ON "pages" USING btree ("content_key");
  CREATE INDEX "_pages_v_version_version_content_key_idx" ON "_pages_v" USING btree ("version_content_key");
  CREATE UNIQUE INDEX "teachings_content_key_idx" ON "teachings" USING btree ("content_key");
  CREATE INDEX "_teachings_v_version_version_content_key_idx" ON "_teachings_v" USING btree ("version_content_key");
  CREATE UNIQUE INDEX "events_content_key_idx" ON "events" USING btree ("content_key");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages" ALTER COLUMN "section" SET DATA TYPE text;
  ALTER TABLE "pages" ALTER COLUMN "section" SET DEFAULT 'other'::text;
  DROP TYPE "public"."enum_pages_section";
  CREATE TYPE "public"."enum_pages_section" AS ENUM('our-church', 'our-faith', 'sunday-school', 'worship', 'support', 'visit', 'other');
  ALTER TABLE "pages" ALTER COLUMN "section" SET DEFAULT 'other'::"public"."enum_pages_section";
  ALTER TABLE "pages" ALTER COLUMN "section" SET DATA TYPE "public"."enum_pages_section" USING "section"::"public"."enum_pages_section";
  ALTER TABLE "_pages_v" ALTER COLUMN "version_section" SET DATA TYPE text;
  ALTER TABLE "_pages_v" ALTER COLUMN "version_section" SET DEFAULT 'other'::text;
  DROP TYPE "public"."enum__pages_v_version_section";
  CREATE TYPE "public"."enum__pages_v_version_section" AS ENUM('our-church', 'our-faith', 'sunday-school', 'worship', 'support', 'visit', 'other');
  ALTER TABLE "_pages_v" ALTER COLUMN "version_section" SET DEFAULT 'other'::"public"."enum__pages_v_version_section";
  ALTER TABLE "_pages_v" ALTER COLUMN "version_section" SET DATA TYPE "public"."enum__pages_v_version_section" USING "version_section"::"public"."enum__pages_v_version_section";
  ALTER TABLE "teachings" ALTER COLUMN "category" SET DATA TYPE text;
  DROP TYPE "public"."enum_teachings_category";
  CREATE TYPE "public"."enum_teachings_category" AS ENUM('christening', 'marriage', 'fitihat', 'mysteries', 'sacraments', 'fasting', 'prayers', 'faq');
  ALTER TABLE "teachings" ALTER COLUMN "category" SET DATA TYPE "public"."enum_teachings_category" USING "category"::"public"."enum_teachings_category";
  ALTER TABLE "_teachings_v" ALTER COLUMN "version_category" SET DATA TYPE text;
  DROP TYPE "public"."enum__teachings_v_version_category";
  CREATE TYPE "public"."enum__teachings_v_version_category" AS ENUM('christening', 'marriage', 'fitihat', 'mysteries', 'sacraments', 'fasting', 'prayers', 'faq');
  ALTER TABLE "_teachings_v" ALTER COLUMN "version_category" SET DATA TYPE "public"."enum__teachings_v_version_category" USING "version_category"::"public"."enum__teachings_v_version_category";
  DROP INDEX "pages_content_key_idx";
  DROP INDEX "_pages_v_version_version_content_key_idx";
  DROP INDEX "teachings_content_key_idx";
  DROP INDEX "_teachings_v_version_version_content_key_idx";
  DROP INDEX "events_content_key_idx";
  ALTER TABLE "pages" DROP COLUMN "content_key";
  ALTER TABLE "_pages_v" DROP COLUMN "version_content_key";
  ALTER TABLE "teachings" DROP COLUMN "content_key";
  ALTER TABLE "_teachings_v" DROP COLUMN "version_content_key";
  ALTER TABLE "events" DROP COLUMN "content_key";`)
}
