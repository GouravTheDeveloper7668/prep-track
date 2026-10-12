-- Migration 006: Create calendar_annotations table
-- PrepTrack — Calendar attendance overrides & date notes

CREATE TABLE IF NOT EXISTS `calendar_annotations` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `date` DATE NOT NULL,
    `type` ENUM('Rest', 'Holiday', 'Normal') NOT NULL DEFAULT 'Normal',
    `note` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_cal_ann_user_date` (`user_id`, `date`),
    CONSTRAINT `fk_cal_ann_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
