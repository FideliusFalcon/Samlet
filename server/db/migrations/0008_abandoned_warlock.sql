CREATE TABLE "document_events" (
	"document_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "document_events_document_id_event_id_pk" PRIMARY KEY("document_id","event_id")
);
--> statement-breakpoint
ALTER TABLE "document_events" ADD CONSTRAINT "document_events_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_events" ADD CONSTRAINT "document_events_event_id_calendar_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE cascade ON UPDATE no action;