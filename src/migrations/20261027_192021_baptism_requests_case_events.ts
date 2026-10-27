import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_baptism_requests_status" AS ENUM('new', 'info_needed', 'clergy_review', 'scheduling', 'confirmed', 'completed', 'declined');
  CREATE TYPE "public"."enum_baptism_requests_applicant_preferred_locale" AS ENUM('am', 'en', 'sv');
  CREATE TYPE "public"."enum_baptism_requests_applicant_parish_relationship" AS ENUM('member', 'regular', 'new');
  CREATE TYPE "public"."enum_baptism_requests_candidate_dateofbirth_tz" AS ENUM('Europe/Stockholm');
  CREATE TYPE "public"."enum_baptism_requests_candidate_category" AS ENUM('infant', 'child', 'adult');
  CREATE TYPE "public"."enum_baptism_requests_internal_scheduleddate_tz" AS ENUM('Europe/Stockholm');
  CREATE TYPE "public"."enum_baptism_requests_internal_clergy_decision" AS ENUM('approve', 'decline', 'needs_prep');
  CREATE TYPE "public"."enum_baptism_requests_source_submittedat_tz" AS ENUM('Europe/Stockholm');
  CREATE TYPE "public"."enum_baptism_requests_archivedat_tz" AS ENUM('Europe/Stockholm');
  CREATE TYPE "public"."enum_case_events_actor_type" AS ENUM('user', 'system');
  CREATE TYPE "public"."enum_case_events_action" AS ENUM('created', 'status_changed', 'note_added', 'email_sent', 'assigned');
  CREATE TYPE "public"."enum_case_events_at_tz" AS ENUM('Europe/Stockholm');
  CREATE TABLE "baptism_requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"reference" varchar,
  	"status" "enum_baptism_requests_status" DEFAULT 'new' NOT NULL,
  	"applicant_name" varchar,
  	"applicant_email" varchar,
  	"applicant_phone" varchar,
  	"applicant_preferred_locale" "enum_baptism_requests_applicant_preferred_locale" DEFAULT 'am' NOT NULL,
  	"applicant_parish_relationship" "enum_baptism_requests_applicant_parish_relationship",
  	"candidate_full_name" varchar,
  	"candidate_date_of_birth" timestamp(3) with time zone,
  	"candidate_dateofbirth_tz" "enum_baptism_requests_candidate_dateofbirth_tz" DEFAULT 'Europe/Stockholm',
  	"candidate_category" "enum_baptism_requests_candidate_category" NOT NULL,
  	"guardian_name" varchar,
  	"guardian_relationship" varchar,
  	"guardian_consent_confirmed" boolean,
  	"preferred_period" varchar,
  	"notes" varchar,
  	"internal_assigned_to_id" integer,
  	"internal_scheduled_date" timestamp(3) with time zone,
  	"internal_scheduleddate_tz" "enum_baptism_requests_internal_scheduleddate_tz" DEFAULT 'Europe/Stockholm',
  	"internal_office_notes" jsonb,
  	"internal_clergy_decision" "enum_baptism_requests_internal_clergy_decision",
  	"internal_clergy_notes" varchar,
  	"privacy_accepted" boolean,
  	"source_ip_hash" varchar,
  	"source_user_agent" varchar,
  	"source_submitted_at" timestamp(3) with time zone,
  	"source_submittedat_tz" "enum_baptism_requests_source_submittedat_tz" DEFAULT 'Europe/Stockholm',
  	"archived_at" timestamp(3) with time zone,
  	"archivedat_tz" "enum_baptism_requests_archivedat_tz" DEFAULT 'Europe/Stockholm',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "case_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"actor_type" "enum_case_events_actor_type" DEFAULT 'system' NOT NULL,
  	"actor_id" integer,
  	"action" "enum_case_events_action" NOT NULL,
  	"from" varchar,
  	"to" varchar,
  	"note" varchar,
  	"at" timestamp(3) with time zone NOT NULL,
  	"at_tz" "enum_case_events_at_tz" DEFAULT 'Europe/Stockholm' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "case_events_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"baptism_requests_id" integer,
  	"inquiries_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "baptism_requests_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "case_events_id" integer;
  ALTER TABLE "baptism_requests" ADD CONSTRAINT "baptism_requests_internal_assigned_to_id_users_id_fk" FOREIGN KEY ("internal_assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "case_events" ADD CONSTRAINT "case_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "case_events_rels" ADD CONSTRAINT "case_events_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."case_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "case_events_rels" ADD CONSTRAINT "case_events_rels_baptism_requests_fk" FOREIGN KEY ("baptism_requests_id") REFERENCES "public"."baptism_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "case_events_rels" ADD CONSTRAINT "case_events_rels_inquiries_fk" FOREIGN KEY ("inquiries_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "baptism_requests_reference_idx" ON "baptism_requests" USING btree ("reference");
  CREATE INDEX "baptism_requests_status_idx" ON "baptism_requests" USING btree ("status");
  CREATE INDEX "baptism_requests_internal_internal_assigned_to_idx" ON "baptism_requests" USING btree ("internal_assigned_to_id");
  CREATE INDEX "baptism_requests_updated_at_idx" ON "baptism_requests" USING btree ("updated_at");
  CREATE INDEX "baptism_requests_created_at_idx" ON "baptism_requests" USING btree ("created_at");
  CREATE INDEX "case_events_actor_idx" ON "case_events" USING btree ("actor_id");
  CREATE INDEX "case_events_at_idx" ON "case_events" USING btree ("at");
  CREATE INDEX "case_events_updated_at_idx" ON "case_events" USING btree ("updated_at");
  CREATE INDEX "case_events_created_at_idx" ON "case_events" USING btree ("created_at");
  CREATE INDEX "case_events_rels_order_idx" ON "case_events_rels" USING btree ("order");
  CREATE INDEX "case_events_rels_parent_idx" ON "case_events_rels" USING btree ("parent_id");
  CREATE INDEX "case_events_rels_path_idx" ON "case_events_rels" USING btree ("path");
  CREATE INDEX "case_events_rels_baptism_requests_id_idx" ON "case_events_rels" USING btree ("baptism_requests_id");
  CREATE INDEX "case_events_rels_inquiries_id_idx" ON "case_events_rels" USING btree ("inquiries_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_baptism_requests_fk" FOREIGN KEY ("baptism_requests_id") REFERENCES "public"."baptism_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_case_events_fk" FOREIGN KEY ("case_events_id") REFERENCES "public"."case_events"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_baptism_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("baptism_requests_id");
  CREATE INDEX "payload_locked_documents_rels_case_events_id_idx" ON "payload_locked_documents_rels" USING btree ("case_events_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "baptism_requests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "case_events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "case_events_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "baptism_requests" CASCADE;
  DROP TABLE "case_events" CASCADE;
  DROP TABLE "case_events_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_baptism_requests_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_case_events_fk";
  
  DROP INDEX "payload_locked_documents_rels_baptism_requests_id_idx";
  DROP INDEX "payload_locked_documents_rels_case_events_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "baptism_requests_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "case_events_id";
  DROP TYPE "public"."enum_baptism_requests_status";
  DROP TYPE "public"."enum_baptism_requests_applicant_preferred_locale";
  DROP TYPE "public"."enum_baptism_requests_applicant_parish_relationship";
  DROP TYPE "public"."enum_baptism_requests_candidate_dateofbirth_tz";
  DROP TYPE "public"."enum_baptism_requests_candidate_category";
  DROP TYPE "public"."enum_baptism_requests_internal_scheduleddate_tz";
  DROP TYPE "public"."enum_baptism_requests_internal_clergy_decision";
  DROP TYPE "public"."enum_baptism_requests_source_submittedat_tz";
  DROP TYPE "public"."enum_baptism_requests_archivedat_tz";
  DROP TYPE "public"."enum_case_events_actor_type";
  DROP TYPE "public"."enum_case_events_action";
  DROP TYPE "public"."enum_case_events_at_tz";`)
}
