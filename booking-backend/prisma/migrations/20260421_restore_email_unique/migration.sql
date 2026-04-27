-- Restore unique constraint on email field (idempotent)
-- The PII encryption migration didn't drop the unique constraint from email,
-- but the Prisma schema was missing the @@unique([email]) declaration.
-- This migration ensures the unique index exists (idempotent for safety).

DO $$
BEGIN
  -- Check if the unique index already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'users'
    AND indexname = 'users_email_key'
  ) THEN
    CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
  END IF;
END $$;
