-- Migration: Add preferredTimezone, fix nullable fields, remove redundant indexes, add extensions
-- Phase 0: Prisma schema fixes

-- CreateExtensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- AlterTable: Add preferredTimezone to users
ALTER TABLE "users" ADD COLUMN "preferred_timezone" TEXT;

-- AlterTable: Make category_id nullable in services
ALTER TABLE "services" ALTER COLUMN "category_id" DROP NOT NULL;

-- AlterTable: Make user_id nullable in notifications
ALTER TABLE "notifications" ALTER COLUMN "user_id" DROP NOT NULL;

-- DropRedundantIndexes: @@index([phoneHash]) and @@index([emailHash]) removed
-- The @unique directive already creates b-tree indexes on these columns
DROP INDEX IF EXISTS "users_phone_hash_idx";
DROP INDEX IF EXISTS "users_email_hash_idx";

-- DropForeignKey: services.category_id now SET NULL instead of CASCADE
ALTER TABLE "services" DROP CONSTRAINT IF EXISTS "services_category_id_fkey";
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropForeignKey: notifications.user_id now SET NULL instead of CASCADE
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_user_id_fkey";
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
