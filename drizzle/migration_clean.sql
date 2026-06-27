-- Create enums first
CREATE TYPE "role" AS ENUM ('user', 'admin');
CREATE TYPE "difficulty" AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE "micro_difficulty" AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE "task_status" AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE "category" AS ENUM ('focus', 'relief', 'inspiration');

-- Create tables
CREATE TABLE "decomposition_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"original_task" text NOT NULL,
	"decomposed_data" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "micro_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"estimated_time" integer NOT NULL,
	"difficulty" "micro_difficulty",
	"completed" boolean DEFAULT false,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "morning_check_ins" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"sleep_quality" integer NOT NULL,
	"energy_level" integer NOT NULL,
	"mental_clarity" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "practices" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" "category" NOT NULL,
	"duration" integer NOT NULL,
	"instructions" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"total_estimated_time" integer,
	"difficulty" "difficulty",
	"status" "task_status" DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "user_practice_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"practice_id" integer NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);

-- Create drizzle migrations table
CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
	id SERIAL PRIMARY KEY,
	hash text NOT NULL,
	created_at bigint
);
