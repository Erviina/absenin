-- Migration: Add metadata fields to faqs table
-- Supports: content_scope, target_roles, content_type, display_context, needs_review

ALTER TABLE "faqs" 
  ADD COLUMN IF NOT EXISTS "content_scope" varchar(50) NOT NULL DEFAULT 'company',
  ADD COLUMN IF NOT EXISTS "target_roles" text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS "content_type" varchar(50) NOT NULL DEFAULT 'faq',
  ADD COLUMN IF NOT EXISTS "display_context" varchar(50) NOT NULL DEFAULT 'help_center',
  ADD COLUMN IF NOT EXISTS "needs_review" boolean NOT NULL DEFAULT false;

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS "faqs_content_scope_idx" ON "faqs" ("content_scope");
CREATE INDEX IF NOT EXISTS "faqs_content_type_idx" ON "faqs" ("content_type");
CREATE INDEX IF NOT EXISTS "faqs_display_context_idx" ON "faqs" ("display_context");
CREATE INDEX IF NOT EXISTS "faqs_needs_review_idx" ON "faqs" ("needs_review");
CREATE INDEX IF NOT EXISTS "faqs_target_roles_gin_idx" ON "faqs" USING GIN ("target_roles");
