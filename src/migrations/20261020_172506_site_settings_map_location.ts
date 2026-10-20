import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" ADD COLUMN "map_location_latitude" numeric;
  ALTER TABLE "site_settings" ADD COLUMN "map_location_longitude" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" DROP COLUMN "map_location_latitude";
  ALTER TABLE "site_settings" DROP COLUMN "map_location_longitude";`)
}
