-- Add PII encryption fields to users table
-- phone 三字段（PII 加密）
ALTER TABLE "users" ADD COLUMN "phone_hash" TEXT;
ALTER TABLE "users" ADD COLUMN "phone_encrypted" TEXT;
CREATE UNIQUE INDEX "users_phone_hash_key" ON "users"("phone_hash");

-- email 三字段（PII 加密）
ALTER TABLE "users" ADD COLUMN "email_hash" TEXT;
ALTER TABLE "users" ADD COLUMN "email_encrypted" TEXT;
CREATE UNIQUE INDEX "users_email_hash_key" ON "users"("email_hash");

-- Create indexes for PII fields
CREATE INDEX "users_phone_hash_idx" ON "users"("phone_hash");
CREATE INDEX "users_email_hash_idx" ON "users"("email_hash");
