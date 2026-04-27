-- Phase2 P1 Enhancements Migration
-- Date: 2026-04-15
-- Description: Add partial indexes and covering indexes for performance optimization

-- ============================================
-- Add password_hash column to users table
-- ============================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- ============================================
-- Partial Index: users.lastLoginAt (for active users only)
-- ============================================
CREATE INDEX IF NOT EXISTS users_active_last_login_idx 
ON users (last_login_at) 
WHERE status = 'ACTIVE';

-- ============================================
-- Partial Index: time_slots capacity (for active slots only)
-- NOTE: This index will be created after schema alignment in migration 002
-- ============================================
-- CREATE INDEX IF NOT EXISTS timeslots_active_capacity_seq 
-- ON time_slots (capacity, current_sequence) 
-- WHERE is_available = true;

-- ============================================
-- Covering Index: appointments pending/confirmed queries
-- NOTE: This index will be created after appointment_date column is added
-- ============================================
-- CREATE INDEX IF NOT EXISTS appointments_pending_include 
-- ON appointments (appointment_date, time_slot_id, status) 
-- INCLUDE (user_id, customer_info) 
-- WHERE status IN ('PENDING', 'CONFIRMED');

-- ============================================
-- Partial Index: notifications pending schedule
-- NOTE: scheduled_at column is added later in this migration, index moved to end
-- ============================================
-- CREATE INDEX IF NOT EXISTS notifications_pending_schedule 
-- ON notifications (status, scheduled_at) 
-- WHERE status = 'PENDING';

-- ============================================
-- Schema changes that Prisma cannot handle automatically
-- ============================================

-- Rename column in service_categories: sort_order -> display_order
-- Note: This should be handled by Prisma migration, but we add it here for safety
ALTER TABLE service_categories 
DROP COLUMN IF EXISTS display_order;

ALTER TABLE service_categories 
ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

-- Copy data from sort_order to display_order if sort_order exists
-- UPDATE service_categories SET display_order = sort_order WHERE sort_order IS NOT NULL;

-- Drop old column if exists (uncomment if needed)
-- ALTER TABLE service_categories DROP COLUMN IF EXISTS sort_order;

-- Add new columns to notifications
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_error TEXT;

-- Migrate subject to title if needed
-- UPDATE notifications SET title = subject WHERE subject IS NOT NULL;

-- Drop old column (uncomment if needed)
-- ALTER TABLE notifications DROP COLUMN IF EXISTS subject;
-- ALTER TABLE notifications DROP COLUMN IF EXISTS error;

-- Add new columns to service_categories
ALTER TABLE service_categories 
ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- ============================================
-- Create partial indexes after columns exist
-- ============================================

-- Partial Index: notifications pending schedule (scheduled_at column now exists)
CREATE INDEX IF NOT EXISTS notifications_pending_schedule 
ON notifications (status, scheduled_at) 
WHERE status = 'PENDING';
