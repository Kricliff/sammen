CREATE TYPE "public"."agent" AS ENUM('strategist', 'research', 'copywriter', 'visual', 'quality', 'publisher', 'engagement', 'analyst', 'revenue', 'cost_controller', 'portfolio', 'orchestrator', 'owner');--> statement-breakpoint
CREATE TYPE "public"."attribution" AS ENUM('direct', 'pro_rata');--> statement-breakpoint
CREATE TYPE "public"."channel" AS ENUM('youtube', 'tiktok', 'instagram', 'facebook', 'linkedin');--> statement-breakpoint
CREATE TYPE "public"."cost_type" AS ENUM('tokens', 'media_image', 'media_video', 'tts', 'storage', 'infra', 'api_call');--> statement-breakpoint
CREATE TYPE "public"."format" AS ENUM('short_video', 'long_video', 'image_post', 'text_post');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('en', 'no');--> statement-breakpoint
CREATE TYPE "public"."revenue_type" AS ENUM('ad', 'sponsor', 'lead');--> statement-breakpoint
CREATE TYPE "public"."content_state" AS ENUM('planned', 'researched', 'drafted', 'visual_ready', 'qa_passed', 'awaiting_approval', 'scheduled', 'published', 'measured', 'settled', 'needs_review', 'revising', 'blocked', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_item_id" uuid,
	"agent" "agent" NOT NULL,
	"model" text,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cached_tokens" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer,
	"status" text NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" text NOT NULL,
	"period_start" date NOT NULL,
	"cap_nok" numeric(14, 4) NOT NULL,
	"spent_nok" numeric(14, 4) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'ok' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_economics" (
	"content_item_id" uuid PRIMARY KEY NOT NULL,
	"total_cost_nok" numeric(14, 4) NOT NULL,
	"total_revenue_nok" numeric(14, 4) NOT NULL,
	"views" bigint NOT NULL,
	"rpm_nok" numeric(14, 4),
	"margin_nok" numeric(14, 4) NOT NULL,
	"margin_pct" numeric(10, 6),
	"settled_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid,
	"state" "content_state" DEFAULT 'planned' NOT NULL,
	"channel" "channel" NOT NULL,
	"format" "format" NOT NULL,
	"language" "language" NOT NULL,
	"script" text,
	"caption" text,
	"hashtags" text[],
	"variant" smallint,
	"ab_group_id" uuid,
	"media_urls" text[],
	"idempotency_key" text NOT NULL,
	"external_post_id" text,
	"published_at" timestamp with time zone,
	"dry_run" boolean DEFAULT true NOT NULL,
	"revision_rounds" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_item_id" uuid NOT NULL,
	"channel" "channel" NOT NULL,
	"measured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"views" bigint DEFAULT 0 NOT NULL,
	"engaged_views" bigint DEFAULT 0 NOT NULL,
	"watch_time_seconds" bigint DEFAULT 0 NOT NULL,
	"retention_pct" numeric(5, 2),
	"likes" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"shares" integer DEFAULT 0 NOT NULL,
	"follows" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_start" date NOT NULL,
	"theme" text NOT NULL,
	"channel" "channel" NOT NULL,
	"format" "format" NOT NULL,
	"language" "language" NOT NULL,
	"angle" text NOT NULL,
	"target_rpm_nok" numeric(14, 4) NOT NULL,
	"cost_cap_nok" numeric(14, 4) NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"rationale" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"content_item_id" uuid,
	"agent" "agent" NOT NULL,
	"type" "cost_type" NOT NULL,
	"quantity" numeric(14, 4) NOT NULL,
	"unit_price_usd" numeric(14, 8) NOT NULL,
	"amount_usd" numeric(14, 4) NOT NULL,
	"fx_rate" numeric(10, 4) NOT NULL,
	"amount_nok" numeric(14, 4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scope" text NOT NULL,
	"insight" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monetization_thresholds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" "channel" NOT NULL,
	"metric" text NOT NULL,
	"required" bigint NOT NULL,
	"current" bigint DEFAULT 0 NOT NULL,
	"measured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"projected_reach_date" date
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"payload" jsonb NOT NULL,
	"sent_at" timestamp with time zone,
	"acknowledged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_tokens" (
	"channel" "channel" PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"scopes" text[] NOT NULL,
	"expires_at" timestamp with time zone,
	"last_refreshed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "portfolio_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decision" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"reasoning" text NOT NULL,
	"enacted_by" text NOT NULL,
	"overridden_by_owner" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qa_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_item_id" uuid NOT NULL,
	"round" smallint NOT NULL,
	"verdict" text NOT NULL,
	"checks" jsonb NOT NULL,
	"reasoning" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_item_id" uuid NOT NULL,
	"claim" text NOT NULL,
	"url" text NOT NULL,
	"publisher" text NOT NULL,
	"retrieved_at" timestamp with time zone NOT NULL,
	"verified" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"channel" "channel" NOT NULL,
	"content_item_id" uuid,
	"type" "revenue_type" NOT NULL,
	"amount" numeric(14, 4) NOT NULL,
	"currency" text NOT NULL,
	"fx_rate" numeric(10, 4) NOT NULL,
	"amount_nok" numeric(14, 4) NOT NULL,
	"source" text NOT NULL,
	"attribution" "attribution" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "state_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_item_id" uuid NOT NULL,
	"from_state" "content_state" NOT NULL,
	"to_state" "content_state" NOT NULL,
	"agent" "agent" NOT NULL,
	"reasoning" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_flags" (
	"key" text PRIMARY KEY NOT NULL,
	"value" boolean NOT NULL,
	"changed_by" text NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_economics" ADD CONSTRAINT "content_economics_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_plan_id_content_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."content_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_metrics" ADD CONSTRAINT "content_metrics_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_events" ADD CONSTRAINT "cost_events_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_reviews" ADD CONSTRAINT "qa_reviews_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_sources" ADD CONSTRAINT "research_sources_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_events" ADD CONSTRAINT "revenue_events_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_transitions" ADD CONSTRAINT "state_transitions_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_runs_item_idx" ON "agent_runs" USING btree ("content_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "budgets_period_idx" ON "budgets" USING btree ("period","period_start");--> statement-breakpoint
CREATE UNIQUE INDEX "content_items_idempotency_key_idx" ON "content_items" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "content_items_state_idx" ON "content_items" USING btree ("state");--> statement-breakpoint
CREATE INDEX "content_items_channel_idx" ON "content_items" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "content_metrics_item_idx" ON "content_metrics" USING btree ("content_item_id","measured_at");--> statement-breakpoint
CREATE INDEX "cost_events_item_idx" ON "cost_events" USING btree ("content_item_id");--> statement-breakpoint
CREATE INDEX "cost_events_occurred_idx" ON "cost_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "monetization_thresholds_idx" ON "monetization_thresholds" USING btree ("channel","metric");--> statement-breakpoint
CREATE INDEX "notifications_created_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "qa_reviews_item_idx" ON "qa_reviews" USING btree ("content_item_id");--> statement-breakpoint
CREATE INDEX "research_sources_item_idx" ON "research_sources" USING btree ("content_item_id");--> statement-breakpoint
CREATE INDEX "revenue_events_item_idx" ON "revenue_events" USING btree ("content_item_id");--> statement-breakpoint
CREATE INDEX "revenue_events_channel_idx" ON "revenue_events" USING btree ("channel","occurred_at");--> statement-breakpoint
CREATE INDEX "state_transitions_item_idx" ON "state_transitions" USING btree ("content_item_id","created_at");