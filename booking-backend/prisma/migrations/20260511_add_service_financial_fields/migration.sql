-- Migration: Add financial fields to Service model
-- Adds price_per_minute and tax_rate columns that were defined in schema.prisma
-- but never migrated to the database

ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "price_per_minute" DECIMAL(10,2);
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "tax_rate" DECIMAL(5,4);
