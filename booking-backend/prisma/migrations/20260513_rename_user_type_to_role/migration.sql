-- Migration: Rename user_type column to role and UserType enum to SystemRole
-- Aligns the database with the updated Prisma schema

-- Step 1: Create new SystemRole enum type with same values
DO $$ BEGIN
  CREATE TYPE "SystemRole" AS ENUM ('CUSTOMER', 'ADMIN', 'SUPER_ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add role column using the new enum type
ALTER TABLE "users" ADD COLUMN "role" "SystemRole";

-- Step 3: Backfill existing data from user_type column
UPDATE "users" SET "role" = CASE 
  WHEN "user_type"::text = 'CUSTOMER' THEN 'CUSTOMER'::"SystemRole"
  WHEN "user_type"::text = 'ADMIN' THEN 'ADMIN'::"SystemRole"
  WHEN "user_type"::text = 'SUPER_ADMIN' THEN 'SUPER_ADMIN'::"SystemRole"
  ELSE 'CUSTOMER'::"SystemRole"
END;

-- Step 4: Set NOT NULL and default on role column
ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER'::"SystemRole";

-- Step 5: Drop old indexes referencing user_type, then drop user_type column
DROP INDEX IF EXISTS "users_user_type_status_idx";
ALTER TABLE "users" DROP COLUMN "user_type";

-- Step 6: Create new index on role column
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- Step 7: Drop the old UserType enum
DROP TYPE IF EXISTS "UserType";
