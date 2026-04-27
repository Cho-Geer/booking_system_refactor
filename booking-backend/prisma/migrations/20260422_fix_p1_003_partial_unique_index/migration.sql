-- FIX-P1-003: 将全量唯一索引改为部分唯一索引
-- 背景：原 appointment_slot_occupied 为全量唯一索引，导致已取消（CANCELLED/EXPIRED）的预约
--       也会占用时间槽位置，无法让其他用户预约同一时段。
-- 修复：改为部分唯一索引，仅对活跃状态（PENDING/CONFIRMED/COMPLETED）的预约生效，
--       已取消或过期的预约不再占位。

-- 删除旧的全量唯一索引（如果存在）
DROP INDEX IF EXISTS appointment_slot_occupied;

-- 创建部分唯一索引（仅对活跃预约生效）
CREATE UNIQUE INDEX IF NOT EXISTS appointment_slot_occupied
ON appointments(time_slot_id, appointment_date, slot_sequence)
WHERE status IN ('PENDING', 'CONFIRMED', 'COMPLETED');
