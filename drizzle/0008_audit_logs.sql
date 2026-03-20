CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"user_id" text,
	"details" jsonb,
	"ip_address" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "audit_logs_action_created_idx" ON "audit_logs" ("action","created_at");
