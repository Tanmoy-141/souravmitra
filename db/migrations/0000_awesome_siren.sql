CREATE TYPE "public"."page_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."site_settings_key" AS ENUM('header', 'footer', 'theme');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner', 'admin');--> statement-breakpoint
CREATE TYPE "public"."verification_type" AS ENUM('email_verify', 'password_reset', 'username_recovery');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(32) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"expires_at" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blob_url" text NOT NULL,
	"pathname" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(64) NOT NULL,
	"size" integer NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"status" "page_status" DEFAULT 'draft' NOT NULL,
	"seo_title" varchar(255),
	"seo_description" text,
	"gjs_data" jsonb,
	"html_cache" text,
	"css_cache" text,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" "site_settings_key" PRIMARY KEY NOT NULL,
	"gjs_data" jsonb,
	"html_cache" text,
	"css_cache" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(64) NOT NULL,
	"password_hash" text,
	"role" "user_role" DEFAULT 'admin' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" varchar(255) NOT NULL,
	"token_hash" text NOT NULL,
	"type" "verification_type" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_account_unique_idx" ON "accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "media_assets_uploaded_by_idx" ON "media_assets" USING btree ("uploaded_by");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_slug_unique_idx" ON "pages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "pages_status_idx" ON "pages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pages_deleted_at_idx" ON "pages" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_unique_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "verification_tokens_identifier_idx" ON "verification_tokens" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_tokens_token_hash_unique_idx" ON "verification_tokens" USING btree ("token_hash");