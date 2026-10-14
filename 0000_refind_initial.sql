CREATE TYPE "public"."claim_status" AS ENUM('pending', 'approved', 'declined');--> statement-breakpoint
CREATE TYPE "public"."item_kind" AS ENUM('lost', 'found');--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('open', 'claimed', 'returned', 'closed');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('suggested', 'reviewed', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."notif_kind" AS ENUM('claim_received', 'claim_approved', 'claim_declined', 'new_message', 'item_returned', 'possible_match');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('student', 'teacher', 'staff');--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"claimant_id" uuid NOT NULL,
	"message" text NOT NULL,
	"proof" text,
	"status" "claim_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"kind" "item_kind" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"color" text,
	"brand" text,
	"location" text NOT NULL,
	"campus_area" text,
	"occurred_on" timestamp NOT NULL,
	"image_url" text,
	"status" "item_status" DEFAULT 'open' NOT NULL,
	"preferred_contact" text,
	"keywords" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lost_item_id" uuid NOT NULL,
	"found_item_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"explanation" text NOT NULL,
	"signals" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "match_status" DEFAULT 'suggested' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"body" text NOT NULL,
	"seen" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "notif_kind" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"href" text,
	"seen" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stored_item_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"item_id" uuid,
	"data" "bytea" NOT NULL,
	"content_type" text NOT NULL,
	"original_name" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" "role" DEFAULT 'student' NOT NULL,
	"department" text,
	"phone" text,
	"bio" text,
	"preferred_contact" text DEFAULT 'chat',
	"accent" text DEFAULT '#1e3a8a' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_claimant_id_users_id_fk" FOREIGN KEY ("claimant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_lost_item_id_items_id_fk" FOREIGN KEY ("lost_item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_found_item_id_items_id_fk" FOREIGN KEY ("found_item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stored_item_images" ADD CONSTRAINT "stored_item_images_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stored_item_images" ADD CONSTRAINT "stored_item_images_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "claims_item_idx" ON "claims" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "claims_claimant_idx" ON "claims" USING btree ("claimant_id");--> statement-breakpoint
CREATE INDEX "claims_status_idx" ON "claims" USING btree ("status");--> statement-breakpoint
CREATE INDEX "items_owner_idx" ON "items" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "items_kind_idx" ON "items" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "items_status_idx" ON "items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "items_category_idx" ON "items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "items_location_idx" ON "items" USING btree ("location");--> statement-breakpoint
CREATE INDEX "matches_lost_idx" ON "matches" USING btree ("lost_item_id");--> statement-breakpoint
CREATE INDEX "matches_found_idx" ON "matches" USING btree ("found_item_id");--> statement-breakpoint
CREATE INDEX "matches_status_idx" ON "matches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "messages_claim_idx" ON "messages" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_seen_idx" ON "notifications" USING btree ("seen");--> statement-breakpoint
CREATE INDEX "stored_item_images_owner_idx" ON "stored_item_images" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stored_item_images_item_unique" ON "stored_item_images" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");