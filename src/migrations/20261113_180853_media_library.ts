import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "audio" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"attached" boolean DEFAULT false,
  	"_objectkey" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "audio_locales" (
  	"title" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "videos" ALTER COLUMN "url" DROP NOT NULL;
  ALTER TABLE "media" ADD COLUMN "guardian_consent" boolean DEFAULT false;
  ALTER TABLE "media" ADD COLUMN "guardian_consent_note" varchar;
  ALTER TABLE "videos" ADD COLUMN "audio_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "audio_id" integer;
  ALTER TABLE "audio_locales" ADD CONSTRAINT "audio_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."audio"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "audio_updated_at_idx" ON "audio" USING btree ("updated_at");
  CREATE INDEX "audio_created_at_idx" ON "audio" USING btree ("created_at");
  CREATE UNIQUE INDEX "audio_filename_idx" ON "audio" USING btree ("filename");
  CREATE UNIQUE INDEX "audio_locales_locale_parent_id_unique" ON "audio_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "audio_locales_parent_id_idx" ON "audio_locales" USING btree ("_parent_id");
  ALTER TABLE "videos" ADD CONSTRAINT "videos_audio_id_audio_id_fk" FOREIGN KEY ("audio_id") REFERENCES "public"."audio"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audio_fk" FOREIGN KEY ("audio_id") REFERENCES "public"."audio"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "videos_audio_idx" ON "videos" USING btree ("audio_id");
  CREATE INDEX "payload_locked_documents_rels_audio_id_idx" ON "payload_locked_documents_rels" USING btree ("audio_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "audio" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "audio_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "audio" CASCADE;
  DROP TABLE "audio_locales" CASCADE;
  ALTER TABLE "videos" DROP CONSTRAINT "videos_audio_id_audio_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_audio_fk";
  
  DROP INDEX "videos_audio_idx";
  DROP INDEX "payload_locked_documents_rels_audio_id_idx";
  ALTER TABLE "videos" ALTER COLUMN "url" SET NOT NULL;
  ALTER TABLE "media" DROP COLUMN "guardian_consent";
  ALTER TABLE "media" DROP COLUMN "guardian_consent_note";
  ALTER TABLE "videos" DROP COLUMN "audio_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "audio_id";`)
}
