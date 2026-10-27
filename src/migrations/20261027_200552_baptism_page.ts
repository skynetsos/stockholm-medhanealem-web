import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "baptism_page_requirements" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "baptism_page_requirements_locales" (
  	"item" varchar NOT NULL,
  	"detail" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "baptism_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"requests_open" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "baptism_page_locales" (
  	"intro" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "baptism_page_requirements" ADD CONSTRAINT "baptism_page_requirements_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."baptism_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "baptism_page_requirements_locales" ADD CONSTRAINT "baptism_page_requirements_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."baptism_page_requirements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "baptism_page_locales" ADD CONSTRAINT "baptism_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."baptism_page"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "baptism_page_requirements_order_idx" ON "baptism_page_requirements" USING btree ("_order");
  CREATE INDEX "baptism_page_requirements_parent_id_idx" ON "baptism_page_requirements" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "baptism_page_requirements_locales_locale_parent_id_unique" ON "baptism_page_requirements_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "baptism_page_requirements_locales_parent_id_idx" ON "baptism_page_requirements_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "baptism_page_locales_locale_parent_id_unique" ON "baptism_page_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "baptism_page_locales_parent_id_idx" ON "baptism_page_locales" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "baptism_page_requirements" CASCADE;
  DROP TABLE "baptism_page_requirements_locales" CASCADE;
  DROP TABLE "baptism_page" CASCADE;
  DROP TABLE "baptism_page_locales" CASCADE;`)
}
