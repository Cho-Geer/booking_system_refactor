/*
  Warnings:

  - The primary key for the `activity_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `appointment_histories` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `appointments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `notifications` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `service_categories` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `services` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `system_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `system_settings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `time_slots` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `user_sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- CreateExtension (using gen_random_uuid from pgcrypto, available in PostgreSQL 13+)
-- Note: gen_random_uuid() is built-in to PostgreSQL 13+, no extension needed

-- DropForeignKey
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "appointment_histories" DROP CONSTRAINT "appointment_histories_appointment_id_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_service_id_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_time_slot_id_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_appointment_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_fkey";

-- DropForeignKey
ALTER TABLE "services" DROP CONSTRAINT "services_category_id_fkey";

-- DropForeignKey
ALTER TABLE "time_slots" DROP CONSTRAINT "time_slots_service_id_fkey";

-- DropForeignKey
ALTER TABLE "user_sessions" DROP CONSTRAINT "user_sessions_user_id_fkey";

-- DropIndex
DROP INDEX "activity_logs_user_created_desc_idx";

-- DropIndex
DROP INDEX "appointment_histories_appt_date_desc_idx";

-- DropIndex
DROP INDEX "time_slots_service_id_idx";

-- AlterTable
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ALTER COLUMN "action" SET DATA TYPE TEXT,
ALTER COLUMN "resource_type" SET DATA TYPE TEXT,
ALTER COLUMN "resource_id" SET DATA TYPE TEXT,
ALTER COLUMN "ip_address" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "appointment_histories" DROP CONSTRAINT "appointment_histories_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "appointment_id" SET DATA TYPE TEXT,
ALTER COLUMN "action" SET DATA TYPE TEXT,
ALTER COLUMN "change_reason" SET DATA TYPE TEXT,
ALTER COLUMN "performed_by" SET DATA TYPE TEXT,
ALTER COLUMN "performed_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "appointment_histories_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ALTER COLUMN "time_slot_id" SET DATA TYPE TEXT,
ALTER COLUMN "service_id" SET DATA TYPE TEXT,
ALTER COLUMN "appointment_number" SET DATA TYPE TEXT,
ALTER COLUMN "appointment_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ALTER COLUMN "appointment_id" SET DATA TYPE TEXT,
ALTER COLUMN "title" SET DATA TYPE TEXT,
ALTER COLUMN "scheduled_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "sent_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "service_categories" DROP CONSTRAINT "service_categories_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "icon_url" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "services" DROP CONSTRAINT "services_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "category_id" SET DATA TYPE TEXT,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "image_url" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "system_logs" DROP CONSTRAINT "system_logs_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "level" SET DATA TYPE TEXT,
ALTER COLUMN "ip_address" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "system_settings" DROP CONSTRAINT "system_settings_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "setting_key" SET DATA TYPE TEXT,
ALTER COLUMN "setting_type" SET DATA TYPE TEXT,
ALTER COLUMN "category" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "time_slots" DROP CONSTRAINT "time_slots_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "service_id" SET DATA TYPE TEXT,
ALTER COLUMN "slot_time" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "time_slots_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user_sessions" DROP CONSTRAINT "user_sessions_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ALTER COLUMN "session_token" SET DATA TYPE TEXT,
ALTER COLUMN "refresh_token" SET DATA TYPE TEXT,
ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "refresh_expires_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "phone" SET DATA TYPE TEXT,
ALTER COLUMN "email" SET DATA TYPE TEXT,
ALTER COLUMN "last_login_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "password_hash" SET DATA TYPE TEXT,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "activity_logs_user_created_desc" ON "activity_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "appointment_history_appt_date_desc" ON "appointment_histories"("appointment_id", "performed_at");

-- CreateIndex
CREATE INDEX "service_categories_display_order_idx" ON "service_categories"("display_order");

-- CreateIndex
CREATE INDEX "service_categories_is_active_display_order_idx" ON "service_categories"("is_active", "display_order");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_slots" ADD CONSTRAINT "time_slots_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_time_slot_id_fkey" FOREIGN KEY ("time_slot_id") REFERENCES "time_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_histories" ADD CONSTRAINT "appointment_histories_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "time_slots_capacity_seq_idx" RENAME TO "timeslots_capacity_seq_idx";
