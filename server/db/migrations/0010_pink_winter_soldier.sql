CREATE TABLE "board_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "board_posts" ADD COLUMN "comments_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "board_comments" ADD CONSTRAINT "board_comments_post_id_board_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."board_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_comments" ADD CONSTRAINT "board_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;