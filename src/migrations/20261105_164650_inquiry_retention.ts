import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_inquiries_archivedat_tz" AS ENUM('Europe/Stockholm');
  ALTER TABLE "inquiries" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "inquiries" ALTER COLUMN "email" DROP NOT NULL;
  ALTER TABLE "inquiries" ADD COLUMN "archived_at" timestamp(3) with time zone;
  ALTER TABLE "inquiries" ADD COLUMN "archivedat_tz" "enum_inquiries_archivedat_tz" DEFAULT 'Europe/Stockholm';
  ALTER TABLE "site_settings" ADD COLUMN "retention_months_inquiries" numeric DEFAULT 12;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "inquiries" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "inquiries" ALTER COLUMN "email" SET NOT NULL;
  ALTER TABLE "inquiries" DROP COLUMN "archived_at";
  ALTER TABLE "inquiries" DROP COLUMN "archivedat_tz";
  ALTER TABLE "site_settings" DROP COLUMN "retention_months_inquiries";
  DROP TYPE "public"."enum_inquiries_archivedat_tz";`)
}
