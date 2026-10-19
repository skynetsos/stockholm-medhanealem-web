import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_events_overrides_date_tz" AS ENUM('Europe/Stockholm');
  CREATE TYPE "public"."enum_events_overrides_action" AS ENUM('cancel', 'move', 'notice');
  CREATE TYPE "public"."enum_events_overrides_newstart_tz" AS ENUM('Europe/Stockholm');
  CREATE TYPE "public"."enum_events_overrides_newend_tz" AS ENUM('Europe/Stockholm');
  CREATE TYPE "public"."enum_events_type" AS ENUM('weekly_service', 'monthly_feast', 'annual_feast', 'fast', 'special', 'notice');
  CREATE TYPE "public"."enum_events_start_tz" AS ENUM('Europe/Stockholm');
  CREATE TYPE "public"."enum_events_end_tz" AS ENUM('Europe/Stockholm');
  CREATE TYPE "public"."enum_events_recurrence_frequency" AS ENUM('none', 'weekly', 'monthly', 'yearly');
  CREATE TYPE "public"."enum_events_recurrence_until_tz" AS ENUM('Europe/Stockholm');
  CREATE TYPE "public"."enum_announcements_publishat_tz" AS ENUM('Europe/Stockholm');
  CREATE TYPE "public"."enum_announcements_expiresat_tz" AS ENUM('Europe/Stockholm');
  CREATE TABLE "events_overrides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"date_tz" "enum_events_overrides_date_tz" DEFAULT 'Europe/Stockholm' NOT NULL,
  	"action" "enum_events_overrides_action" DEFAULT 'cancel' NOT NULL,
  	"new_start" timestamp(3) with time zone,
  	"newstart_tz" "enum_events_overrides_newstart_tz" DEFAULT 'Europe/Stockholm',
  	"new_end" timestamp(3) with time zone,
  	"newend_tz" "enum_events_overrides_newend_tz" DEFAULT 'Europe/Stockholm'
  );
  
  CREATE TABLE "events_overrides_locales" (
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum_events_type" NOT NULL,
  	"all_day" boolean DEFAULT false,
  	"start" timestamp(3) with time zone NOT NULL,
  	"start_tz" "enum_events_start_tz" DEFAULT 'Europe/Stockholm' NOT NULL,
  	"end" timestamp(3) with time zone,
  	"end_tz" "enum_events_end_tz" DEFAULT 'Europe/Stockholm',
  	"livestream_url" varchar,
  	"recurrence_frequency" "enum_events_recurrence_frequency" DEFAULT 'none',
  	"recurrence_ethiopian_day" numeric,
  	"recurrence_ethiopian_month" numeric,
  	"recurrence_until" timestamp(3) with time zone,
  	"recurrence_until_tz" "enum_events_recurrence_until_tz" DEFAULT 'Europe/Stockholm',
  	"cancelled" boolean DEFAULT false,
  	"featured" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "events_locales" (
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"location" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "announcements" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"publish_at" timestamp(3) with time zone NOT NULL,
  	"publishat_tz" "enum_announcements_publishat_tz" DEFAULT 'Europe/Stockholm' NOT NULL,
  	"expires_at" timestamp(3) with time zone,
  	"expiresat_tz" "enum_announcements_expiresat_tz" DEFAULT 'Europe/Stockholm',
  	"urgent" boolean DEFAULT false,
  	"pinned" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "announcements_locales" (
  	"title" varchar NOT NULL,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "events_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "announcements_id" integer;
  ALTER TABLE "events_overrides" ADD CONSTRAINT "events_overrides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_overrides_locales" ADD CONSTRAINT "events_overrides_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events_overrides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_locales" ADD CONSTRAINT "events_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "announcements_locales" ADD CONSTRAINT "announcements_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "events_overrides_order_idx" ON "events_overrides" USING btree ("_order");
  CREATE INDEX "events_overrides_parent_id_idx" ON "events_overrides" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "events_overrides_locales_locale_parent_id_unique" ON "events_overrides_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "events_overrides_locales_parent_id_idx" ON "events_overrides_locales" USING btree ("_parent_id");
  CREATE INDEX "events_start_idx" ON "events" USING btree ("start");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE UNIQUE INDEX "events_locales_locale_parent_id_unique" ON "events_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "events_locales_parent_id_idx" ON "events_locales" USING btree ("_parent_id");
  CREATE INDEX "announcements_publish_at_idx" ON "announcements" USING btree ("publish_at");
  CREATE INDEX "announcements_expires_at_idx" ON "announcements" USING btree ("expires_at");
  CREATE INDEX "announcements_updated_at_idx" ON "announcements" USING btree ("updated_at");
  CREATE INDEX "announcements_created_at_idx" ON "announcements" USING btree ("created_at");
  CREATE UNIQUE INDEX "announcements_locales_locale_parent_id_unique" ON "announcements_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "announcements_locales_parent_id_idx" ON "announcements_locales" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_announcements_fk" FOREIGN KEY ("announcements_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_announcements_id_idx" ON "payload_locked_documents_rels" USING btree ("announcements_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events_overrides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "events_overrides_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "events_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "announcements" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "announcements_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "events_overrides" CASCADE;
  DROP TABLE "events_overrides_locales" CASCADE;
  DROP TABLE "events" CASCADE;
  DROP TABLE "events_locales" CASCADE;
  DROP TABLE "announcements" CASCADE;
  DROP TABLE "announcements_locales" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_events_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_announcements_fk";
  
  DROP INDEX "payload_locked_documents_rels_events_id_idx";
  DROP INDEX "payload_locked_documents_rels_announcements_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "events_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "announcements_id";
  DROP TYPE "public"."enum_events_overrides_date_tz";
  DROP TYPE "public"."enum_events_overrides_action";
  DROP TYPE "public"."enum_events_overrides_newstart_tz";
  DROP TYPE "public"."enum_events_overrides_newend_tz";
  DROP TYPE "public"."enum_events_type";
  DROP TYPE "public"."enum_events_start_tz";
  DROP TYPE "public"."enum_events_end_tz";
  DROP TYPE "public"."enum_events_recurrence_frequency";
  DROP TYPE "public"."enum_events_recurrence_until_tz";
  DROP TYPE "public"."enum_announcements_publishat_tz";
  DROP TYPE "public"."enum_announcements_expiresat_tz";`)
}
