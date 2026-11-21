import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_baptism_requests_candidate_gender" AS ENUM('male', 'female');
  CREATE TYPE "public"."enum_inquiries_dateofpassing_tz" AS ENUM('Europe/Stockholm');
  CREATE TYPE "public"."enum_inquiries_preferreddate_tz" AS ENUM('Europe/Stockholm');
  CREATE TYPE "public"."enum_inquiries_request_type" AS ENUM('confession', 'sick', 'home_blessing', 'comfort', 'blessing', 'appointment', 'other');
  ALTER TABLE "homepage_sections" ALTER COLUMN "section" SET DATA TYPE text;
  DROP TYPE "public"."enum_homepage_sections_section";
  CREATE TYPE "public"."enum_homepage_sections_section" AS ENUM('hero', 'about', 'nextService', 'upcomingHolyDays', 'latestNotice', 'sundaySchool', 'gallery', 'visit');
  ALTER TABLE "homepage_sections" ALTER COLUMN "section" SET DATA TYPE "public"."enum_homepage_sections_section" USING "section"::"public"."enum_homepage_sections_section";
  ALTER TABLE "baptism_requests" ADD COLUMN "candidate_baptismal_name" varchar;
  ALTER TABLE "baptism_requests" ADD COLUMN "candidate_gender" "enum_baptism_requests_candidate_gender";
  ALTER TABLE "baptism_requests" ADD COLUMN "candidate_place_of_birth" varchar;
  ALTER TABLE "baptism_requests" ADD COLUMN "family_father_name" varchar;
  ALTER TABLE "baptism_requests" ADD COLUMN "family_mother_name" varchar;
  ALTER TABLE "baptism_requests" ADD COLUMN "family_godparent_name" varchar;
  ALTER TABLE "baptism_requests" ADD COLUMN "priest_name" varchar;
  ALTER TABLE "inquiries" ADD COLUMN "partner_name" varchar;
  ALTER TABLE "inquiries" ADD COLUMN "partner_phone" varchar;
  ALTER TABLE "inquiries" ADD COLUMN "deceased_name" varchar;
  ALTER TABLE "inquiries" ADD COLUMN "date_of_passing" timestamp(3) with time zone;
  ALTER TABLE "inquiries" ADD COLUMN "dateofpassing_tz" "enum_inquiries_dateofpassing_tz" DEFAULT 'Europe/Stockholm';
  ALTER TABLE "inquiries" ADD COLUMN "preferred_date" timestamp(3) with time zone;
  ALTER TABLE "inquiries" ADD COLUMN "preferreddate_tz" "enum_inquiries_preferreddate_tz" DEFAULT 'Europe/Stockholm';
  ALTER TABLE "inquiries" ADD COLUMN "request_type" "enum_inquiries_request_type";
  ALTER TABLE "inquiries" ADD COLUMN "priest_id" integer;
  ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_priest_id_clergy_id_fk" FOREIGN KEY ("priest_id") REFERENCES "public"."clergy"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "inquiries_priest_idx" ON "inquiries" USING btree ("priest_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "inquiries" DROP CONSTRAINT "inquiries_priest_id_clergy_id_fk";
  
  ALTER TABLE "homepage_sections" ALTER COLUMN "section" SET DATA TYPE text;
  DROP TYPE "public"."enum_homepage_sections_section";
  CREATE TYPE "public"."enum_homepage_sections_section" AS ENUM('hero', 'nextService', 'upcomingHolyDays', 'latestNotice', 'about', 'sundaySchool', 'gallery', 'visit');
  ALTER TABLE "homepage_sections" ALTER COLUMN "section" SET DATA TYPE "public"."enum_homepage_sections_section" USING "section"::"public"."enum_homepage_sections_section";
  DROP INDEX "inquiries_priest_idx";
  ALTER TABLE "baptism_requests" DROP COLUMN "candidate_baptismal_name";
  ALTER TABLE "baptism_requests" DROP COLUMN "candidate_gender";
  ALTER TABLE "baptism_requests" DROP COLUMN "candidate_place_of_birth";
  ALTER TABLE "baptism_requests" DROP COLUMN "family_father_name";
  ALTER TABLE "baptism_requests" DROP COLUMN "family_mother_name";
  ALTER TABLE "baptism_requests" DROP COLUMN "family_godparent_name";
  ALTER TABLE "baptism_requests" DROP COLUMN "priest_name";
  ALTER TABLE "inquiries" DROP COLUMN "partner_name";
  ALTER TABLE "inquiries" DROP COLUMN "partner_phone";
  ALTER TABLE "inquiries" DROP COLUMN "deceased_name";
  ALTER TABLE "inquiries" DROP COLUMN "date_of_passing";
  ALTER TABLE "inquiries" DROP COLUMN "dateofpassing_tz";
  ALTER TABLE "inquiries" DROP COLUMN "preferred_date";
  ALTER TABLE "inquiries" DROP COLUMN "preferreddate_tz";
  ALTER TABLE "inquiries" DROP COLUMN "request_type";
  ALTER TABLE "inquiries" DROP COLUMN "priest_id";
  DROP TYPE "public"."enum_baptism_requests_candidate_gender";
  DROP TYPE "public"."enum_inquiries_dateofpassing_tz";
  DROP TYPE "public"."enum_inquiries_preferreddate_tz";
  DROP TYPE "public"."enum_inquiries_request_type";`)
}
