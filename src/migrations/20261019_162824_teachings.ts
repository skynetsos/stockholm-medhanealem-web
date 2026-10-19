import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_teachings_category" AS ENUM('christening', 'marriage', 'fitihat', 'mysteries', 'sacraments', 'fasting', 'prayers', 'faq');
  CREATE TYPE "public"."enum_teachings_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__teachings_v_version_category" AS ENUM('christening', 'marriage', 'fitihat', 'mysteries', 'sacraments', 'fasting', 'prayers', 'faq');
  CREATE TYPE "public"."enum__teachings_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__teachings_v_published_locale" AS ENUM('am', 'en', 'sv');
  CREATE TABLE "teachings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"category" "enum_teachings_category",
  	"slug" varchar,
  	"approved_by_id" integer,
  	"approved_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_teachings_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "teachings_locales" (
  	"title" varchar,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_teachings_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_category" "enum__teachings_v_version_category",
  	"version_slug" varchar,
  	"version_approved_by_id" integer,
  	"version_approved_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__teachings_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__teachings_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_teachings_v_locales" (
  	"version_title" varchar,
  	"version_body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "teachings_id" integer;
  ALTER TABLE "teachings" ADD CONSTRAINT "teachings_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "teachings_locales" ADD CONSTRAINT "teachings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."teachings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_teachings_v" ADD CONSTRAINT "_teachings_v_parent_id_teachings_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."teachings"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_teachings_v" ADD CONSTRAINT "_teachings_v_version_approved_by_id_users_id_fk" FOREIGN KEY ("version_approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_teachings_v_locales" ADD CONSTRAINT "_teachings_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_teachings_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "teachings_slug_idx" ON "teachings" USING btree ("slug");
  CREATE INDEX "teachings_approved_by_idx" ON "teachings" USING btree ("approved_by_id");
  CREATE INDEX "teachings_updated_at_idx" ON "teachings" USING btree ("updated_at");
  CREATE INDEX "teachings_created_at_idx" ON "teachings" USING btree ("created_at");
  CREATE INDEX "teachings__status_idx" ON "teachings" USING btree ("_status");
  CREATE UNIQUE INDEX "teachings_locales_locale_parent_id_unique" ON "teachings_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "teachings_locales_parent_id_idx" ON "teachings_locales" USING btree ("_parent_id");
  CREATE INDEX "_teachings_v_parent_idx" ON "_teachings_v" USING btree ("parent_id");
  CREATE INDEX "_teachings_v_version_version_slug_idx" ON "_teachings_v" USING btree ("version_slug");
  CREATE INDEX "_teachings_v_version_version_approved_by_idx" ON "_teachings_v" USING btree ("version_approved_by_id");
  CREATE INDEX "_teachings_v_version_version_updated_at_idx" ON "_teachings_v" USING btree ("version_updated_at");
  CREATE INDEX "_teachings_v_version_version_created_at_idx" ON "_teachings_v" USING btree ("version_created_at");
  CREATE INDEX "_teachings_v_version_version__status_idx" ON "_teachings_v" USING btree ("version__status");
  CREATE INDEX "_teachings_v_created_at_idx" ON "_teachings_v" USING btree ("created_at");
  CREATE INDEX "_teachings_v_updated_at_idx" ON "_teachings_v" USING btree ("updated_at");
  CREATE INDEX "_teachings_v_snapshot_idx" ON "_teachings_v" USING btree ("snapshot");
  CREATE INDEX "_teachings_v_published_locale_idx" ON "_teachings_v" USING btree ("published_locale");
  CREATE INDEX "_teachings_v_latest_idx" ON "_teachings_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_teachings_v_locales_locale_parent_id_unique" ON "_teachings_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_teachings_v_locales_parent_id_idx" ON "_teachings_v_locales" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_teachings_fk" FOREIGN KEY ("teachings_id") REFERENCES "public"."teachings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_teachings_id_idx" ON "payload_locked_documents_rels" USING btree ("teachings_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "teachings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "teachings_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_teachings_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_teachings_v_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "teachings" CASCADE;
  DROP TABLE "teachings_locales" CASCADE;
  DROP TABLE "_teachings_v" CASCADE;
  DROP TABLE "_teachings_v_locales" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_teachings_fk";
  
  DROP INDEX "payload_locked_documents_rels_teachings_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "teachings_id";
  DROP TYPE "public"."enum_teachings_category";
  DROP TYPE "public"."enum_teachings_status";
  DROP TYPE "public"."enum__teachings_v_version_category";
  DROP TYPE "public"."enum__teachings_v_version_status";
  DROP TYPE "public"."enum__teachings_v_published_locale";`)
}
