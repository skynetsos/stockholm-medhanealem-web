import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_case_events_action" ADD VALUE 'archived';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "case_events" ALTER COLUMN "action" SET DATA TYPE text;
  DROP TYPE "public"."enum_case_events_action";
  CREATE TYPE "public"."enum_case_events_action" AS ENUM('created', 'status_changed', 'note_added', 'email_sent', 'assigned');
  ALTER TABLE "case_events" ALTER COLUMN "action" SET DATA TYPE "public"."enum_case_events_action" USING "action"::"public"."enum_case_events_action";`)
}
