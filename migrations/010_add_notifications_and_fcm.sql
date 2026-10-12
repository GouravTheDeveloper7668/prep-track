-- Migration 010: Add notifications tracking and FCM tokens table
-- PrepTrack — Real-time Firebase & Chrome Notifications

-- 1. Add notification flags to tasks table
ALTER TABLE `tasks` 
ADD COLUMN IF NOT EXISTS `is_notified` TINYINT(1) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS `notified_at` TIMESTAMP NULL DEFAULT NULL;

-- 2. Create user_fcm_tokens table to store device FCM tokens
CREATE TABLE IF NOT EXISTS `user_fcm_tokens` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `token` TEXT NOT NULL,
    `token_hash` VARCHAR(64) NOT NULL,
    `device_info` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_user_token_hash` (`user_id`, `token_hash`),
    CONSTRAINT `fk_fcm_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create notification_logs table to track sent notifications (guarantee single notification, no duplicate repeat)
CREATE TABLE IF NOT EXISTS `notification_logs` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `task_id` VARCHAR(64) NULL,
    `title` VARCHAR(255) NOT NULL,
    `body` TEXT NULL,
    `channel` VARCHAR(50) DEFAULT 'firebase_chrome',
    `status` ENUM('sent', 'failed', 'delivered') DEFAULT 'sent',
    `response_payload` TEXT NULL,
    `sent_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_notif_user_task` (`user_id`, `task_id`),
    CONSTRAINT `fk_notif_log_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
