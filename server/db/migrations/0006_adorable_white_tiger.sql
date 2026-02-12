ALTER TABLE "users" ADD COLUMN "ics_token" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_ics_token_unique" UNIQUE("ics_token");