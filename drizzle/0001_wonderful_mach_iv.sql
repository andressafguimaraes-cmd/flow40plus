CREATE TYPE "public"."task_priority" AS ENUM('urgente', 'alta', 'media', 'baixa', 'sem');--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "priority" "task_priority" DEFAULT 'sem';