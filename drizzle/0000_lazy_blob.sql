CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(100) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"is_super_admin" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admins_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_type" varchar(20) NOT NULL,
	"actor_id" varchar(100) NOT NULL,
	"action" varchar(100) NOT NULL,
	"target_type" varchar(50),
	"target_id" varchar(100),
	"details" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer,
	"roll_number" varchar(50) NOT NULL,
	"name_snapshot" varchar(255) NOT NULL,
	"course_snapshot" varchar(100) NOT NULL,
	"year_of_study_snapshot" varchar(20) NOT NULL,
	"block_room_snapshot" varchar(20) NOT NULL,
	"meal" varchar(20) NOT NULL,
	"complaint_text" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" varchar(100),
	"deleted_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gala_dates" (
	"id" serial PRIMARY KEY NOT NULL,
	"gala_date" varchar(10) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gala_dates_gala_date_unique" UNIQUE("gala_date")
);
--> statement-breakpoint
CREATE TABLE "lockouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"key_type" varchar(20) NOT NULL,
	"key_value" varchar(100) NOT NULL,
	"locked_until" timestamp NOT NULL,
	"reason" varchar(50) DEFAULT 'login_failures' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"identifier" varchar(100) NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"user_agent" text,
	"outcome" varchar(20) NOT NULL,
	"user_type" varchar(20) DEFAULT 'boarder' NOT NULL,
	"attempted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smc_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"roll_number" varchar(50) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "smc_users_roll_number_unique" UNIQUE("roll_number")
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"roll_number" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"block" varchar(1) NOT NULL,
	"room_number" varchar(20) NOT NULL,
	"course" varchar(100) NOT NULL,
	"year_of_joining" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "students_roll_number_unique" UNIQUE("roll_number")
);
--> statement-breakpoint
CREATE TABLE "submission_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"roll_number" varchar(50) NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"user_agent" text,
	"meal" varchar(20),
	"outcome" varchar(50) NOT NULL,
	"attempted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;