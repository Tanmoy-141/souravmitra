CREATE TYPE "public"."comment_status" AS ENUM('published', 'pending', 'hidden', 'spam');--> statement-breakpoint
CREATE TABLE "project_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"visitor_id" varchar(128) NOT NULL,
	"author" varchar(80) NOT NULL,
	"content" text NOT NULL,
	"status" "comment_status" DEFAULT 'published' NOT NULL,
	"ip_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"visitor_id" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"visitor_id" varchar(128) NOT NULL,
	"ip_hash" varchar(64),
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_likes" ADD CONSTRAINT "project_likes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_views" ADD CONSTRAINT "project_views_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_comments_project_created_idx" ON "project_comments" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "project_comments_status_idx" ON "project_comments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_comments_visitor_idx" ON "project_comments" USING btree ("visitor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_likes_project_visitor_unique_idx" ON "project_likes" USING btree ("project_id","visitor_id");--> statement-breakpoint
CREATE INDEX "project_likes_project_id_idx" ON "project_likes" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_likes_visitor_id_idx" ON "project_likes" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "project_views_project_visitor_viewed_idx" ON "project_views" USING btree ("project_id","visitor_id","viewed_at");--> statement-breakpoint
CREATE INDEX "project_views_project_id_idx" ON "project_views" USING btree ("project_id");