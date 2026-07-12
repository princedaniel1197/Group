CREATE TABLE "profiles" (
	"name" text PRIMARY KEY NOT NULL,
	"intro" text,
	"dob" text,
	"milestones" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
