-- Migration: Add financial fields to Appointment model + create BookingGroup table
-- Adds duration_minutes, price, tax_rate, tax_included_amount, booking_group_id
-- Creates booking_groups table

-- Step 1: Create booking_groups table
CREATE TABLE IF NOT EXISTS "booking_groups" (
    "id" TEXT NOT NULL,
    "total_duration" INTEGER NOT NULL,
    "total_price" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "booking_groups_pkey" PRIMARY KEY ("id")
);

-- Step 2: Add financial columns to appointments table
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "duration_minutes" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "price" DECIMAL(10,2);
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "tax_rate" DECIMAL(5,4);
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "tax_included_amount" DECIMAL(10,2);
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "booking_group_id" TEXT;

-- Step 3: Add foreign key constraint for booking_group_id
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_booking_group_id_fkey" 
    FOREIGN KEY ("booking_group_id") REFERENCES "booking_groups"("id") ON UPDATE CASCADE ON DELETE SET NULL;

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS "booking_groups_created_at_idx" ON "booking_groups"("created_at");
CREATE INDEX IF NOT EXISTS "appointments_booking_group_id_idx" ON "appointments"("booking_group_id");
