CREATE TYPE "public"."ad_concept_status" AS ENUM('draft', 'approved', 'generated');--> statement-breakpoint
CREATE TYPE "public"."ad_image_status" AS ENUM('pending', 'generated', 'failed');--> statement-breakpoint
CREATE TYPE "public"."step_type" AS ENUM('welcome', 'multiple-choice', 'checkboxes', 'email', 'text-input', 'number-picker', 'info-card', 'checkout', 'result');--> statement-breakpoint
CREATE TABLE "ad_concepts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"angle_name" text NOT NULL,
	"angle" text NOT NULL,
	"headline" text NOT NULL,
	"body_copy" text NOT NULL,
	"cta" text NOT NULL,
	"visual_direction" text NOT NULL,
	"image_prompt" text,
	"why_this_works" text,
	"status" "ad_concept_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ad_concept_id" uuid NOT NULL,
	"design_json" jsonb,
	"prompt" text NOT NULL,
	"blob_url" text,
	"blob_pathname" text,
	"status" "ad_image_status" DEFAULT 'pending' NOT NULL,
	"generation_params" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funnel_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"funnel_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"step_id" text NOT NULL,
	"type" "step_type" NOT NULL,
	"config" jsonb NOT NULL,
	"show_if" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funnels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"version" text,
	"price_variant" text,
	"theme" jsonb NOT NULL,
	"tracking" jsonb,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "funnels_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"product_description" text NOT NULL,
	"target_audience" text NOT NULL,
	"intake" jsonb,
	"inferred" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"funnel_step_id" uuid,
	"step_id" text NOT NULL,
	"value" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"funnel_id" uuid NOT NULL,
	"session_token" text NOT NULL,
	"email" text,
	"ip" text,
	"user_agent" text,
	"utm_params" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "step_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"step_id" text NOT NULL,
	"step_index" integer,
	"step_type" text,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ad_concepts" ADD CONSTRAINT "ad_concepts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_images" ADD CONSTRAINT "ad_images_ad_concept_id_ad_concepts_id_fk" FOREIGN KEY ("ad_concept_id") REFERENCES "public"."ad_concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_steps" ADD CONSTRAINT "funnel_steps_funnel_id_funnels_id_fk" FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnels" ADD CONSTRAINT "funnels_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_funnel_step_id_funnel_steps_id_fk" FOREIGN KEY ("funnel_step_id") REFERENCES "public"."funnel_steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_funnel_id_funnels_id_fk" FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_views" ADD CONSTRAINT "step_views_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "responses_session_step_idx" ON "responses" USING btree ("session_id","step_id");