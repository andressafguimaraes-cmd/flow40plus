ALTER TABLE "tasks" ADD COLUMN "recurrence_rule" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "recurrence_end_date" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "series_id" integer;