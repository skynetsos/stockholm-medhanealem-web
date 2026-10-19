import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_hero_ctas_link_type" AS ENUM('page', 'internal', 'external');
  CREATE TYPE "public"."enum_pages_blocks_two_column_image_position" AS ENUM('right', 'left');
  CREATE TYPE "public"."enum_pages_blocks_call_to_action_links_link_type" AS ENUM('page', 'internal', 'external');
  CREATE TYPE "public"."enum_pages_blocks_call_to_action_links_style" AS ENUM('primary', 'secondary');
  CREATE TYPE "public"."enum_pages_blocks_event_list_types" AS ENUM('weekly_service', 'monthly_feast', 'annual_feast', 'fast', 'special', 'notice');
  CREATE TYPE "public"."enum_pages_section" AS ENUM('our-church', 'our-faith', 'sunday-school', 'worship', 'support', 'visit', 'other');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_version_hero_ctas_link_type" AS ENUM('page', 'internal', 'external');
  CREATE TYPE "public"."enum__pages_v_blocks_two_column_image_position" AS ENUM('right', 'left');
  CREATE TYPE "public"."enum__pages_v_blocks_call_to_action_links_link_type" AS ENUM('page', 'internal', 'external');
  CREATE TYPE "public"."enum__pages_v_blocks_call_to_action_links_style" AS ENUM('primary', 'secondary');
  CREATE TYPE "public"."enum__pages_v_blocks_event_list_types" AS ENUM('weekly_service', 'monthly_feast', 'annual_feast', 'fast', 'special', 'notice');
  CREATE TYPE "public"."enum__pages_v_version_section" AS ENUM('our-church', 'our-faith', 'sunday-school', 'worship', 'support', 'visit', 'other');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_published_locale" AS ENUM('am', 'en', 'sv');
  ALTER TYPE "public"."enum_navigation_header_items_children_link_type" ADD VALUE 'page' BEFORE 'internal';
  ALTER TYPE "public"."enum_navigation_header_items_link_type" ADD VALUE 'page' BEFORE 'internal';
  ALTER TYPE "public"."enum_navigation_header_c_t_as_link_type" ADD VALUE 'page' BEFORE 'internal';
  ALTER TYPE "public"."enum_footer_columns_links_link_type" ADD VALUE 'page' BEFORE 'internal';
  ALTER TYPE "public"."enum_footer_legal_links_link_type" ADD VALUE 'page' BEFORE 'internal';
  ALTER TYPE "public"."enum_footer_diocese_link_type" ADD VALUE 'page' BEFORE 'internal';
  CREATE TABLE "pages_hero_ctas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_pages_hero_ctas_link_type" DEFAULT 'internal',
  	"link_new_tab" boolean,
  	"link_page_id" integer,
  	"link_path" varchar,
  	"link_url" varchar
  );
  
  CREATE TABLE "pages_hero_ctas_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_two_column" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"image_position" "enum_pages_blocks_two_column_image_position" DEFAULT 'right',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_two_column_locales" (
  	"left" jsonb,
  	"right" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_image_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_image_gallery_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_call_to_action_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_pages_blocks_call_to_action_links_link_type" DEFAULT 'internal',
  	"link_new_tab" boolean,
  	"link_page_id" integer,
  	"link_path" varchar,
  	"link_url" varchar,
  	"style" "enum_pages_blocks_call_to_action_links_style" DEFAULT 'primary'
  );
  
  CREATE TABLE "pages_blocks_call_to_action_links_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_call_to_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_call_to_action_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_faq_items_locales" (
  	"question" varchar,
  	"answer" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_faq_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_clergy_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"limit" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_clergy_grid_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_event_list_types" (
  	"order" integer NOT NULL,
  	"parent_id" varchar NOT NULL,
  	"value" "enum_pages_blocks_event_list_types",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_event_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"limit" numeric DEFAULT 5,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_event_list_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_video_embed" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_video_embed_locales" (
  	"title" varchar,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"section" "enum_pages_section" DEFAULT 'other',
  	"slug" varchar,
  	"hero_image_id" integer,
  	"seo_og_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "pages_locales" (
  	"title" varchar,
  	"hero_heading" varchar,
  	"hero_subheading" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "_pages_v_version_hero_ctas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__pages_v_version_hero_ctas_link_type" DEFAULT 'internal',
  	"link_new_tab" boolean,
  	"link_page_id" integer,
  	"link_path" varchar,
  	"link_url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_version_hero_ctas_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_two_column" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"image_position" "enum__pages_v_blocks_two_column_image_position" DEFAULT 'right',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_two_column_locales" (
  	"left" jsonb,
  	"right" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_image_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_image_gallery_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_call_to_action_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__pages_v_blocks_call_to_action_links_link_type" DEFAULT 'internal',
  	"link_new_tab" boolean,
  	"link_page_id" integer,
  	"link_path" varchar,
  	"link_url" varchar,
  	"style" "enum__pages_v_blocks_call_to_action_links_style" DEFAULT 'primary',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_call_to_action_links_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_call_to_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_call_to_action_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq_items_locales" (
  	"question" varchar,
  	"answer" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_clergy_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"limit" numeric,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_clergy_grid_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_event_list_types" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__pages_v_blocks_event_list_types",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_event_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"limit" numeric DEFAULT 5,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_event_list_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_video_embed" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_video_embed_locales" (
  	"title" varchar,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_section" "enum__pages_v_version_section" DEFAULT 'other',
  	"version_slug" varchar,
  	"version_hero_image_id" integer,
  	"version_seo_og_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__pages_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_pages_v_locales" (
  	"version_title" varchar,
  	"version_hero_heading" varchar,
  	"version_hero_subheading" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "pages_id" integer;
  ALTER TABLE "navigation_header_items_children" ADD COLUMN "link_page_id" integer;
  ALTER TABLE "navigation_header_items" ADD COLUMN "link_page_id" integer;
  ALTER TABLE "navigation_header_c_t_as" ADD COLUMN "link_page_id" integer;
  ALTER TABLE "footer_columns_links" ADD COLUMN "link_page_id" integer;
  ALTER TABLE "footer_legal_links" ADD COLUMN "link_page_id" integer;
  ALTER TABLE "footer" ADD COLUMN "diocese_link_page_id" integer;
  ALTER TABLE "pages_hero_ctas" ADD CONSTRAINT "pages_hero_ctas_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_hero_ctas" ADD CONSTRAINT "pages_hero_ctas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_hero_ctas_locales" ADD CONSTRAINT "pages_hero_ctas_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_hero_ctas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_rich_text" ADD CONSTRAINT "pages_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_rich_text_locales" ADD CONSTRAINT "pages_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_two_column" ADD CONSTRAINT "pages_blocks_two_column_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_two_column" ADD CONSTRAINT "pages_blocks_two_column_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_two_column_locales" ADD CONSTRAINT "pages_blocks_two_column_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_two_column"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_image_gallery" ADD CONSTRAINT "pages_blocks_image_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_image_gallery_locales" ADD CONSTRAINT "pages_blocks_image_gallery_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_image_gallery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_call_to_action_links" ADD CONSTRAINT "pages_blocks_call_to_action_links_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_call_to_action_links" ADD CONSTRAINT "pages_blocks_call_to_action_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_call_to_action"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_call_to_action_links_locales" ADD CONSTRAINT "pages_blocks_call_to_action_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_call_to_action_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_call_to_action" ADD CONSTRAINT "pages_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_call_to_action_locales" ADD CONSTRAINT "pages_blocks_call_to_action_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_call_to_action"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_items" ADD CONSTRAINT "pages_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_items_locales" ADD CONSTRAINT "pages_blocks_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq" ADD CONSTRAINT "pages_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_locales" ADD CONSTRAINT "pages_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_clergy_grid" ADD CONSTRAINT "pages_blocks_clergy_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_clergy_grid_locales" ADD CONSTRAINT "pages_blocks_clergy_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_clergy_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_event_list_types" ADD CONSTRAINT "pages_blocks_event_list_types_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages_blocks_event_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_event_list" ADD CONSTRAINT "pages_blocks_event_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_event_list_locales" ADD CONSTRAINT "pages_blocks_event_list_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_event_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_video_embed" ADD CONSTRAINT "pages_blocks_video_embed_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_video_embed_locales" ADD CONSTRAINT "pages_blocks_video_embed_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_video_embed"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_locales" ADD CONSTRAINT "pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_version_hero_ctas" ADD CONSTRAINT "_pages_v_version_hero_ctas_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_version_hero_ctas" ADD CONSTRAINT "_pages_v_version_hero_ctas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_version_hero_ctas_locales" ADD CONSTRAINT "_pages_v_version_hero_ctas_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_version_hero_ctas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_rich_text" ADD CONSTRAINT "_pages_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_rich_text_locales" ADD CONSTRAINT "_pages_v_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_two_column" ADD CONSTRAINT "_pages_v_blocks_two_column_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_two_column" ADD CONSTRAINT "_pages_v_blocks_two_column_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_two_column_locales" ADD CONSTRAINT "_pages_v_blocks_two_column_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_two_column"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_image_gallery" ADD CONSTRAINT "_pages_v_blocks_image_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_image_gallery_locales" ADD CONSTRAINT "_pages_v_blocks_image_gallery_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_image_gallery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_call_to_action_links" ADD CONSTRAINT "_pages_v_blocks_call_to_action_links_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_call_to_action_links" ADD CONSTRAINT "_pages_v_blocks_call_to_action_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_call_to_action"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_call_to_action_links_locales" ADD CONSTRAINT "_pages_v_blocks_call_to_action_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_call_to_action_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_call_to_action" ADD CONSTRAINT "_pages_v_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_call_to_action_locales" ADD CONSTRAINT "_pages_v_blocks_call_to_action_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_call_to_action"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_items" ADD CONSTRAINT "_pages_v_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_items_locales" ADD CONSTRAINT "_pages_v_blocks_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq" ADD CONSTRAINT "_pages_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_locales" ADD CONSTRAINT "_pages_v_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_clergy_grid" ADD CONSTRAINT "_pages_v_blocks_clergy_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_clergy_grid_locales" ADD CONSTRAINT "_pages_v_blocks_clergy_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_clergy_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_event_list_types" ADD CONSTRAINT "_pages_v_blocks_event_list_types_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pages_v_blocks_event_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_event_list" ADD CONSTRAINT "_pages_v_blocks_event_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_event_list_locales" ADD CONSTRAINT "_pages_v_blocks_event_list_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_event_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_video_embed" ADD CONSTRAINT "_pages_v_blocks_video_embed_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_video_embed_locales" ADD CONSTRAINT "_pages_v_blocks_video_embed_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_video_embed"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_seo_og_image_id_media_id_fk" FOREIGN KEY ("version_seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_locales" ADD CONSTRAINT "_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_hero_ctas_order_idx" ON "pages_hero_ctas" USING btree ("_order");
  CREATE INDEX "pages_hero_ctas_parent_id_idx" ON "pages_hero_ctas" USING btree ("_parent_id");
  CREATE INDEX "pages_hero_ctas_link_link_page_idx" ON "pages_hero_ctas" USING btree ("link_page_id");
  CREATE UNIQUE INDEX "pages_hero_ctas_locales_locale_parent_id_unique" ON "pages_hero_ctas_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_hero_ctas_locales_parent_id_idx" ON "pages_hero_ctas_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_rich_text_order_idx" ON "pages_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_rich_text_parent_id_idx" ON "pages_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_rich_text_path_idx" ON "pages_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_rich_text_locales_locale_parent_id_unique" ON "pages_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_rich_text_locales_parent_id_idx" ON "pages_blocks_rich_text_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_two_column_order_idx" ON "pages_blocks_two_column" USING btree ("_order");
  CREATE INDEX "pages_blocks_two_column_parent_id_idx" ON "pages_blocks_two_column" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_two_column_path_idx" ON "pages_blocks_two_column" USING btree ("_path");
  CREATE INDEX "pages_blocks_two_column_image_idx" ON "pages_blocks_two_column" USING btree ("image_id");
  CREATE UNIQUE INDEX "pages_blocks_two_column_locales_locale_parent_id_unique" ON "pages_blocks_two_column_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_two_column_locales_parent_id_idx" ON "pages_blocks_two_column_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_image_gallery_order_idx" ON "pages_blocks_image_gallery" USING btree ("_order");
  CREATE INDEX "pages_blocks_image_gallery_parent_id_idx" ON "pages_blocks_image_gallery" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_image_gallery_path_idx" ON "pages_blocks_image_gallery" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_image_gallery_locales_locale_parent_id_unique" ON "pages_blocks_image_gallery_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_image_gallery_locales_parent_id_idx" ON "pages_blocks_image_gallery_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_call_to_action_links_order_idx" ON "pages_blocks_call_to_action_links" USING btree ("_order");
  CREATE INDEX "pages_blocks_call_to_action_links_parent_id_idx" ON "pages_blocks_call_to_action_links" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_call_to_action_links_link_link_page_idx" ON "pages_blocks_call_to_action_links" USING btree ("link_page_id");
  CREATE UNIQUE INDEX "pages_blocks_call_to_action_links_locales_locale_parent_id_u" ON "pages_blocks_call_to_action_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_call_to_action_links_locales_parent_id_idx" ON "pages_blocks_call_to_action_links_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_call_to_action_order_idx" ON "pages_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "pages_blocks_call_to_action_parent_id_idx" ON "pages_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_call_to_action_path_idx" ON "pages_blocks_call_to_action" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_call_to_action_locales_locale_parent_id_unique" ON "pages_blocks_call_to_action_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_call_to_action_locales_parent_id_idx" ON "pages_blocks_call_to_action_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_items_order_idx" ON "pages_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_items_parent_id_idx" ON "pages_blocks_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_faq_items_locales_locale_parent_id_unique" ON "pages_blocks_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_faq_items_locales_parent_id_idx" ON "pages_blocks_faq_items_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_order_idx" ON "pages_blocks_faq" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_parent_id_idx" ON "pages_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_path_idx" ON "pages_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_faq_locales_locale_parent_id_unique" ON "pages_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_faq_locales_parent_id_idx" ON "pages_blocks_faq_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_clergy_grid_order_idx" ON "pages_blocks_clergy_grid" USING btree ("_order");
  CREATE INDEX "pages_blocks_clergy_grid_parent_id_idx" ON "pages_blocks_clergy_grid" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_clergy_grid_path_idx" ON "pages_blocks_clergy_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_clergy_grid_locales_locale_parent_id_unique" ON "pages_blocks_clergy_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_clergy_grid_locales_parent_id_idx" ON "pages_blocks_clergy_grid_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_event_list_types_order_idx" ON "pages_blocks_event_list_types" USING btree ("order");
  CREATE INDEX "pages_blocks_event_list_types_parent_idx" ON "pages_blocks_event_list_types" USING btree ("parent_id");
  CREATE INDEX "pages_blocks_event_list_order_idx" ON "pages_blocks_event_list" USING btree ("_order");
  CREATE INDEX "pages_blocks_event_list_parent_id_idx" ON "pages_blocks_event_list" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_event_list_path_idx" ON "pages_blocks_event_list" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_event_list_locales_locale_parent_id_unique" ON "pages_blocks_event_list_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_event_list_locales_parent_id_idx" ON "pages_blocks_event_list_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_video_embed_order_idx" ON "pages_blocks_video_embed" USING btree ("_order");
  CREATE INDEX "pages_blocks_video_embed_parent_id_idx" ON "pages_blocks_video_embed" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_video_embed_path_idx" ON "pages_blocks_video_embed" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_video_embed_locales_locale_parent_id_unique" ON "pages_blocks_video_embed_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_video_embed_locales_parent_id_idx" ON "pages_blocks_video_embed_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_hero_hero_image_idx" ON "pages" USING btree ("hero_image_id");
  CREATE INDEX "pages_seo_seo_og_image_idx" ON "pages" USING btree ("seo_og_image_id");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE UNIQUE INDEX "section_slug_idx" ON "pages" USING btree ("section","slug");
  CREATE UNIQUE INDEX "pages_locales_locale_parent_id_unique" ON "pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_locales_parent_id_idx" ON "pages_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_rels_order_idx" ON "pages_rels" USING btree ("order");
  CREATE INDEX "pages_rels_parent_idx" ON "pages_rels" USING btree ("parent_id");
  CREATE INDEX "pages_rels_path_idx" ON "pages_rels" USING btree ("path");
  CREATE INDEX "pages_rels_media_id_idx" ON "pages_rels" USING btree ("media_id");
  CREATE INDEX "_pages_v_version_hero_ctas_order_idx" ON "_pages_v_version_hero_ctas" USING btree ("_order");
  CREATE INDEX "_pages_v_version_hero_ctas_parent_id_idx" ON "_pages_v_version_hero_ctas" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_version_hero_ctas_link_link_page_idx" ON "_pages_v_version_hero_ctas" USING btree ("link_page_id");
  CREATE UNIQUE INDEX "_pages_v_version_hero_ctas_locales_locale_parent_id_unique" ON "_pages_v_version_hero_ctas_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_version_hero_ctas_locales_parent_id_idx" ON "_pages_v_version_hero_ctas_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_rich_text_order_idx" ON "_pages_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_rich_text_parent_id_idx" ON "_pages_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_rich_text_path_idx" ON "_pages_v_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_rich_text_locales_locale_parent_id_unique" ON "_pages_v_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_rich_text_locales_parent_id_idx" ON "_pages_v_blocks_rich_text_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_two_column_order_idx" ON "_pages_v_blocks_two_column" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_two_column_parent_id_idx" ON "_pages_v_blocks_two_column" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_two_column_path_idx" ON "_pages_v_blocks_two_column" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_two_column_image_idx" ON "_pages_v_blocks_two_column" USING btree ("image_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_two_column_locales_locale_parent_id_unique" ON "_pages_v_blocks_two_column_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_two_column_locales_parent_id_idx" ON "_pages_v_blocks_two_column_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_image_gallery_order_idx" ON "_pages_v_blocks_image_gallery" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_image_gallery_parent_id_idx" ON "_pages_v_blocks_image_gallery" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_image_gallery_path_idx" ON "_pages_v_blocks_image_gallery" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_image_gallery_locales_locale_parent_id_uniqu" ON "_pages_v_blocks_image_gallery_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_image_gallery_locales_parent_id_idx" ON "_pages_v_blocks_image_gallery_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_call_to_action_links_order_idx" ON "_pages_v_blocks_call_to_action_links" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_call_to_action_links_parent_id_idx" ON "_pages_v_blocks_call_to_action_links" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_call_to_action_links_link_link_page_idx" ON "_pages_v_blocks_call_to_action_links" USING btree ("link_page_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_call_to_action_links_locales_locale_parent_i" ON "_pages_v_blocks_call_to_action_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_call_to_action_links_locales_parent_id_idx" ON "_pages_v_blocks_call_to_action_links_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_call_to_action_order_idx" ON "_pages_v_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_call_to_action_parent_id_idx" ON "_pages_v_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_call_to_action_path_idx" ON "_pages_v_blocks_call_to_action" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_call_to_action_locales_locale_parent_id_uniq" ON "_pages_v_blocks_call_to_action_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_call_to_action_locales_parent_id_idx" ON "_pages_v_blocks_call_to_action_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_items_order_idx" ON "_pages_v_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_items_parent_id_idx" ON "_pages_v_blocks_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_faq_items_locales_locale_parent_id_unique" ON "_pages_v_blocks_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_items_locales_parent_id_idx" ON "_pages_v_blocks_faq_items_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_order_idx" ON "_pages_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_parent_id_idx" ON "_pages_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_path_idx" ON "_pages_v_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_faq_locales_locale_parent_id_unique" ON "_pages_v_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_locales_parent_id_idx" ON "_pages_v_blocks_faq_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_clergy_grid_order_idx" ON "_pages_v_blocks_clergy_grid" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_clergy_grid_parent_id_idx" ON "_pages_v_blocks_clergy_grid" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_clergy_grid_path_idx" ON "_pages_v_blocks_clergy_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_clergy_grid_locales_locale_parent_id_unique" ON "_pages_v_blocks_clergy_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_clergy_grid_locales_parent_id_idx" ON "_pages_v_blocks_clergy_grid_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_event_list_types_order_idx" ON "_pages_v_blocks_event_list_types" USING btree ("order");
  CREATE INDEX "_pages_v_blocks_event_list_types_parent_idx" ON "_pages_v_blocks_event_list_types" USING btree ("parent_id");
  CREATE INDEX "_pages_v_blocks_event_list_order_idx" ON "_pages_v_blocks_event_list" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_event_list_parent_id_idx" ON "_pages_v_blocks_event_list" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_event_list_path_idx" ON "_pages_v_blocks_event_list" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_event_list_locales_locale_parent_id_unique" ON "_pages_v_blocks_event_list_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_event_list_locales_parent_id_idx" ON "_pages_v_blocks_event_list_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_video_embed_order_idx" ON "_pages_v_blocks_video_embed" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_video_embed_parent_id_idx" ON "_pages_v_blocks_video_embed" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_video_embed_path_idx" ON "_pages_v_blocks_video_embed" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_video_embed_locales_locale_parent_id_unique" ON "_pages_v_blocks_video_embed_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_video_embed_locales_parent_id_idx" ON "_pages_v_blocks_video_embed_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_hero_version_hero_image_idx" ON "_pages_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_pages_v_version_seo_version_seo_og_image_idx" ON "_pages_v" USING btree ("version_seo_og_image_id");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_snapshot_idx" ON "_pages_v" USING btree ("snapshot");
  CREATE INDEX "_pages_v_published_locale_idx" ON "_pages_v" USING btree ("published_locale");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  CREATE INDEX "version_section_version_slug_idx" ON "_pages_v" USING btree ("version_section","version_slug");
  CREATE UNIQUE INDEX "_pages_v_locales_locale_parent_id_unique" ON "_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_locales_parent_id_idx" ON "_pages_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_rels_order_idx" ON "_pages_v_rels" USING btree ("order");
  CREATE INDEX "_pages_v_rels_parent_idx" ON "_pages_v_rels" USING btree ("parent_id");
  CREATE INDEX "_pages_v_rels_path_idx" ON "_pages_v_rels" USING btree ("path");
  CREATE INDEX "_pages_v_rels_media_id_idx" ON "_pages_v_rels" USING btree ("media_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_header_items_children" ADD CONSTRAINT "navigation_header_items_children_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "navigation_header_items" ADD CONSTRAINT "navigation_header_items_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "navigation_header_c_t_as" ADD CONSTRAINT "navigation_header_c_t_as_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "footer_columns_links" ADD CONSTRAINT "footer_columns_links_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "footer_legal_links" ADD CONSTRAINT "footer_legal_links_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "footer" ADD CONSTRAINT "footer_diocese_link_page_id_pages_id_fk" FOREIGN KEY ("diocese_link_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "navigation_header_items_children_link_link_page_idx" ON "navigation_header_items_children" USING btree ("link_page_id");
  CREATE INDEX "navigation_header_items_link_link_page_idx" ON "navigation_header_items" USING btree ("link_page_id");
  CREATE INDEX "navigation_header_c_t_as_link_link_page_idx" ON "navigation_header_c_t_as" USING btree ("link_page_id");
  CREATE INDEX "footer_columns_links_link_link_page_idx" ON "footer_columns_links" USING btree ("link_page_id");
  CREATE INDEX "footer_legal_links_link_link_page_idx" ON "footer_legal_links" USING btree ("link_page_id");
  CREATE INDEX "footer_diocese_link_diocese_link_page_idx" ON "footer" USING btree ("diocese_link_page_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_hero_ctas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_hero_ctas_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_rich_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_rich_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_two_column" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_two_column_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_image_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_image_gallery_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_call_to_action_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_call_to_action_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_call_to_action" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_call_to_action_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_faq_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_faq_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_clergy_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_clergy_grid_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_event_list_types" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_event_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_event_list_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_video_embed" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_video_embed_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_version_hero_ctas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_version_hero_ctas_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_rich_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_rich_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_two_column" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_two_column_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_image_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_image_gallery_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_call_to_action_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_call_to_action_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_call_to_action" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_call_to_action_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_faq_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_faq_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_clergy_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_clergy_grid_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_event_list_types" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_event_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_event_list_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_video_embed" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_video_embed_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_hero_ctas" CASCADE;
  DROP TABLE "pages_hero_ctas_locales" CASCADE;
  DROP TABLE "pages_blocks_rich_text" CASCADE;
  DROP TABLE "pages_blocks_rich_text_locales" CASCADE;
  DROP TABLE "pages_blocks_two_column" CASCADE;
  DROP TABLE "pages_blocks_two_column_locales" CASCADE;
  DROP TABLE "pages_blocks_image_gallery" CASCADE;
  DROP TABLE "pages_blocks_image_gallery_locales" CASCADE;
  DROP TABLE "pages_blocks_call_to_action_links" CASCADE;
  DROP TABLE "pages_blocks_call_to_action_links_locales" CASCADE;
  DROP TABLE "pages_blocks_call_to_action" CASCADE;
  DROP TABLE "pages_blocks_call_to_action_locales" CASCADE;
  DROP TABLE "pages_blocks_faq_items" CASCADE;
  DROP TABLE "pages_blocks_faq_items_locales" CASCADE;
  DROP TABLE "pages_blocks_faq" CASCADE;
  DROP TABLE "pages_blocks_faq_locales" CASCADE;
  DROP TABLE "pages_blocks_clergy_grid" CASCADE;
  DROP TABLE "pages_blocks_clergy_grid_locales" CASCADE;
  DROP TABLE "pages_blocks_event_list_types" CASCADE;
  DROP TABLE "pages_blocks_event_list" CASCADE;
  DROP TABLE "pages_blocks_event_list_locales" CASCADE;
  DROP TABLE "pages_blocks_video_embed" CASCADE;
  DROP TABLE "pages_blocks_video_embed_locales" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "pages_locales" CASCADE;
  DROP TABLE "pages_rels" CASCADE;
  DROP TABLE "_pages_v_version_hero_ctas" CASCADE;
  DROP TABLE "_pages_v_version_hero_ctas_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_rich_text" CASCADE;
  DROP TABLE "_pages_v_blocks_rich_text_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_two_column" CASCADE;
  DROP TABLE "_pages_v_blocks_two_column_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_image_gallery" CASCADE;
  DROP TABLE "_pages_v_blocks_image_gallery_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_call_to_action_links" CASCADE;
  DROP TABLE "_pages_v_blocks_call_to_action_links_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_call_to_action" CASCADE;
  DROP TABLE "_pages_v_blocks_call_to_action_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_items" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_items_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_faq" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_clergy_grid" CASCADE;
  DROP TABLE "_pages_v_blocks_clergy_grid_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_event_list_types" CASCADE;
  DROP TABLE "_pages_v_blocks_event_list" CASCADE;
  DROP TABLE "_pages_v_blocks_event_list_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_video_embed" CASCADE;
  DROP TABLE "_pages_v_blocks_video_embed_locales" CASCADE;
  DROP TABLE "_pages_v" CASCADE;
  DROP TABLE "_pages_v_locales" CASCADE;
  DROP TABLE "_pages_v_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_pages_fk";
  
  ALTER TABLE "navigation_header_items_children" DROP CONSTRAINT "navigation_header_items_children_link_page_id_pages_id_fk";
  
  ALTER TABLE "navigation_header_items" DROP CONSTRAINT "navigation_header_items_link_page_id_pages_id_fk";
  
  ALTER TABLE "navigation_header_c_t_as" DROP CONSTRAINT "navigation_header_c_t_as_link_page_id_pages_id_fk";
  
  ALTER TABLE "footer_columns_links" DROP CONSTRAINT "footer_columns_links_link_page_id_pages_id_fk";
  
  ALTER TABLE "footer_legal_links" DROP CONSTRAINT "footer_legal_links_link_page_id_pages_id_fk";
  
  ALTER TABLE "footer" DROP CONSTRAINT "footer_diocese_link_page_id_pages_id_fk";
  
  ALTER TABLE "navigation_header_items_children" ALTER COLUMN "link_type" SET DATA TYPE text;
  ALTER TABLE "navigation_header_items_children" ALTER COLUMN "link_type" SET DEFAULT 'internal'::text;
  DROP TYPE "public"."enum_navigation_header_items_children_link_type";
  CREATE TYPE "public"."enum_navigation_header_items_children_link_type" AS ENUM('internal', 'external');
  ALTER TABLE "navigation_header_items_children" ALTER COLUMN "link_type" SET DEFAULT 'internal'::"public"."enum_navigation_header_items_children_link_type";
  ALTER TABLE "navigation_header_items_children" ALTER COLUMN "link_type" SET DATA TYPE "public"."enum_navigation_header_items_children_link_type" USING "link_type"::"public"."enum_navigation_header_items_children_link_type";
  ALTER TABLE "navigation_header_items" ALTER COLUMN "link_type" SET DATA TYPE text;
  ALTER TABLE "navigation_header_items" ALTER COLUMN "link_type" SET DEFAULT 'internal'::text;
  DROP TYPE "public"."enum_navigation_header_items_link_type";
  CREATE TYPE "public"."enum_navigation_header_items_link_type" AS ENUM('internal', 'external');
  ALTER TABLE "navigation_header_items" ALTER COLUMN "link_type" SET DEFAULT 'internal'::"public"."enum_navigation_header_items_link_type";
  ALTER TABLE "navigation_header_items" ALTER COLUMN "link_type" SET DATA TYPE "public"."enum_navigation_header_items_link_type" USING "link_type"::"public"."enum_navigation_header_items_link_type";
  ALTER TABLE "navigation_header_c_t_as" ALTER COLUMN "link_type" SET DATA TYPE text;
  ALTER TABLE "navigation_header_c_t_as" ALTER COLUMN "link_type" SET DEFAULT 'internal'::text;
  DROP TYPE "public"."enum_navigation_header_c_t_as_link_type";
  CREATE TYPE "public"."enum_navigation_header_c_t_as_link_type" AS ENUM('internal', 'external');
  ALTER TABLE "navigation_header_c_t_as" ALTER COLUMN "link_type" SET DEFAULT 'internal'::"public"."enum_navigation_header_c_t_as_link_type";
  ALTER TABLE "navigation_header_c_t_as" ALTER COLUMN "link_type" SET DATA TYPE "public"."enum_navigation_header_c_t_as_link_type" USING "link_type"::"public"."enum_navigation_header_c_t_as_link_type";
  ALTER TABLE "footer_columns_links" ALTER COLUMN "link_type" SET DATA TYPE text;
  ALTER TABLE "footer_columns_links" ALTER COLUMN "link_type" SET DEFAULT 'internal'::text;
  DROP TYPE "public"."enum_footer_columns_links_link_type";
  CREATE TYPE "public"."enum_footer_columns_links_link_type" AS ENUM('internal', 'external');
  ALTER TABLE "footer_columns_links" ALTER COLUMN "link_type" SET DEFAULT 'internal'::"public"."enum_footer_columns_links_link_type";
  ALTER TABLE "footer_columns_links" ALTER COLUMN "link_type" SET DATA TYPE "public"."enum_footer_columns_links_link_type" USING "link_type"::"public"."enum_footer_columns_links_link_type";
  ALTER TABLE "footer_legal_links" ALTER COLUMN "link_type" SET DATA TYPE text;
  ALTER TABLE "footer_legal_links" ALTER COLUMN "link_type" SET DEFAULT 'internal'::text;
  DROP TYPE "public"."enum_footer_legal_links_link_type";
  CREATE TYPE "public"."enum_footer_legal_links_link_type" AS ENUM('internal', 'external');
  ALTER TABLE "footer_legal_links" ALTER COLUMN "link_type" SET DEFAULT 'internal'::"public"."enum_footer_legal_links_link_type";
  ALTER TABLE "footer_legal_links" ALTER COLUMN "link_type" SET DATA TYPE "public"."enum_footer_legal_links_link_type" USING "link_type"::"public"."enum_footer_legal_links_link_type";
  ALTER TABLE "footer" ALTER COLUMN "diocese_link_type" SET DATA TYPE text;
  ALTER TABLE "footer" ALTER COLUMN "diocese_link_type" SET DEFAULT 'internal'::text;
  DROP TYPE "public"."enum_footer_diocese_link_type";
  CREATE TYPE "public"."enum_footer_diocese_link_type" AS ENUM('internal', 'external');
  ALTER TABLE "footer" ALTER COLUMN "diocese_link_type" SET DEFAULT 'internal'::"public"."enum_footer_diocese_link_type";
  ALTER TABLE "footer" ALTER COLUMN "diocese_link_type" SET DATA TYPE "public"."enum_footer_diocese_link_type" USING "diocese_link_type"::"public"."enum_footer_diocese_link_type";
  DROP INDEX "payload_locked_documents_rels_pages_id_idx";
  DROP INDEX "navigation_header_items_children_link_link_page_idx";
  DROP INDEX "navigation_header_items_link_link_page_idx";
  DROP INDEX "navigation_header_c_t_as_link_link_page_idx";
  DROP INDEX "footer_columns_links_link_link_page_idx";
  DROP INDEX "footer_legal_links_link_link_page_idx";
  DROP INDEX "footer_diocese_link_diocese_link_page_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "pages_id";
  ALTER TABLE "navigation_header_items_children" DROP COLUMN "link_page_id";
  ALTER TABLE "navigation_header_items" DROP COLUMN "link_page_id";
  ALTER TABLE "navigation_header_c_t_as" DROP COLUMN "link_page_id";
  ALTER TABLE "footer_columns_links" DROP COLUMN "link_page_id";
  ALTER TABLE "footer_legal_links" DROP COLUMN "link_page_id";
  ALTER TABLE "footer" DROP COLUMN "diocese_link_page_id";
  DROP TYPE "public"."enum_pages_hero_ctas_link_type";
  DROP TYPE "public"."enum_pages_blocks_two_column_image_position";
  DROP TYPE "public"."enum_pages_blocks_call_to_action_links_link_type";
  DROP TYPE "public"."enum_pages_blocks_call_to_action_links_style";
  DROP TYPE "public"."enum_pages_blocks_event_list_types";
  DROP TYPE "public"."enum_pages_section";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum__pages_v_version_hero_ctas_link_type";
  DROP TYPE "public"."enum__pages_v_blocks_two_column_image_position";
  DROP TYPE "public"."enum__pages_v_blocks_call_to_action_links_link_type";
  DROP TYPE "public"."enum__pages_v_blocks_call_to_action_links_style";
  DROP TYPE "public"."enum__pages_v_blocks_event_list_types";
  DROP TYPE "public"."enum__pages_v_version_section";
  DROP TYPE "public"."enum__pages_v_version_status";
  DROP TYPE "public"."enum__pages_v_published_locale";`)
}
