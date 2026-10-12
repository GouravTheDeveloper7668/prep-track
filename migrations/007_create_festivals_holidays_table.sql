-- Migration 007: Create festivals_holidays table
-- PrepTrack — Festivals & Holidays Manager

CREATE TABLE IF NOT EXISTS `festivals_holidays` (
    `id` VARCHAR(64) NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `holiday_date` DATE NOT NULL,
    `description` VARCHAR(255) NULL,
    `is_annual` TINYINT(1) NOT NULL DEFAULT 0,
    `policy` ENUM('Full Holiday', 'Light Study', 'Normal Study') NOT NULL DEFAULT 'Full Holiday',
    `is_sample` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_holidays_user_date` (`user_id`, `holiday_date`),
    CONSTRAINT `fk_holidays_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
