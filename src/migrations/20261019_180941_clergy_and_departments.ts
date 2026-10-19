import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "clergy" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"photo_id" integer,
  	"order" numeric DEFAULT 100,
  	"published" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "clergy_locales" (
  	"name" varchar NOT NULL,
  	"title" varchar,
  	"bio" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "departments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"image_id" integer,
  	"order" numeric DEFAULT 100,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "departments_locales" (
  	"name" varchar NOT NULL,
  	"summary" varchar,
  	"body" jsonb,
  	"leader_name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "clergy_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "departments_id" integer;
  ALTER TABLE "clergy" ADD CONSTRAINT "clergy_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clergy_locales" ADD CONSTRAINT "clergy_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clergy"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "departments" ADD CONSTRAINT "departments_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "departments_locales" ADD CONSTRAINT "departments_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "clergy_photo_idx" ON "clergy" USING btree ("photo_id");
  CREATE INDEX "clergy_updated_at_idx" ON "clergy" USING btree ("updated_at");
  CREATE INDEX "clergy_created_at_idx" ON "clergy" USING btree ("created_at");
  CREATE UNIQUE INDEX "clergy_locales_locale_parent_id_unique" ON "clergy_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "clergy_locales_parent_id_idx" ON "clergy_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "departments_slug_idx" ON "departments" USING btree ("slug");
  CREATE INDEX "departments_image_idx" ON "departments" USING btree ("image_id");
  CREATE INDEX "departments_updated_at_idx" ON "departments" USING btree ("updated_at");
  CREATE INDEX "departments_created_at_idx" ON "departments" USING btree ("created_at");
  CREATE UNIQUE INDEX "departments_locales_locale_parent_id_unique" ON "departments_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "departments_locales_parent_id_idx" ON "departments_locales" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_clergy_fk" FOREIGN KEY ("clergy_id") REFERENCES "public"."clergy"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_departments_fk" FOREIGN KEY ("departments_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_clergy_id_idx" ON "payload_locked_documents_rels" USING btree ("clergy_id");
  CREATE INDEX "payload_locked_documents_rels_departments_id_idx" ON "payload_locked_documents_rels" USING btree ("departments_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "clergy" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clergy_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "departments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "departments_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "clergy" CASCADE;
  DROP TABLE "clergy_locales" CASCADE;
  DROP TABLE "departments" CASCADE;
  DROP TABLE "departments_locales" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_clergy_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_departments_fk";
  
  DROP INDEX "payload_locked_documents_rels_clergy_id_idx";
  DROP INDEX "payload_locked_documents_rels_departments_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "clergy_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "departments_id";`)
}
