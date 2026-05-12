-- Migration: TimeSlot start/end time migration
-- Replaces slot_time (String) with start_time (DateTime) and end_time (DateTime)
-- Removes duration_minutes, display_order fields from time_slots
-- Generated: 2026-05-11

-- Step 1: Drop the unique constraint on slot_time (from @unique directive)
ALTER TABLE "time_slots" DROP CONSTRAINT "time_slots_slot_time_key";

-- Step 2: Add new columns as nullable first
ALTER TABLE "time_slots" ADD COLUMN "start_time" TIMESTAMP;
ALTER TABLE "time_slots" ADD COLUMN "end_time" TIMESTAMP;

-- Step 3: Backfill existing data
-- slot_time was stored as ISO 8601 string, parse it to timestamp
-- end_time = start_time + duration_minutes
UPDATE "time_slots" 
SET "start_time" = TRIM( BOTH '"' FROM "slot_time"::TEXT)::timestamp,
    "end_time" = (TRIM( BOTH '"' FROM "slot_time"::TEXT)::timestamp + ("duration_minutes" * interval '1 minute'))
WHERE "slot_time" IS NOT NULL;

-- Step 4: Make columns NOT NULL
ALTER TABLE "time_slots" ALTER COLUMN "start_time" SET NOT NULL;
ALTER TABLE "time_slots" ALTER COLUMN "end_time" SET NOT NULL;

-- Step 5: Drop old indexes on removed columns
DROP INDEX IF EXISTS "time_slots_slot_time_idx";
DROP INDEX IF EXISTS "time_slots_display_order_idx";

-- Step 6: Drop old columns
ALTER TABLE "time_slots" DROP COLUMN "slot_time";
ALTER TABLE "time_slots" DROP COLUMN "duration_minutes";
ALTER TABLE "time_slots" DROP COLUMN "display_order";

-- Step 7: Create new indexes
CREATE INDEX "time_slots_service_id_start_time_end_time_idx" ON "time_slots"("service_id", "start_time", "end_time");
CREATE INDEX "time_slots_start_time_idx" ON "time_slots"("start_time");
