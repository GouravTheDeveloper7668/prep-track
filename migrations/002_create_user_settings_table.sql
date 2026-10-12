-- Migration 002: Create user_settings table
-- PrepTrack — 120-Day Interview Journey Settings

CREATE TABLE IF NOT EXISTS `user_settings` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `start_date` DATE NOT NULL,
    `target_date` DATE NOT NULL,
    `goal_days` INT NOT NULL DEFAULT 120,
    `daily_target_minutes` INT NOT NULL DEFAULT 210,
    `weekly_target_minutes` INT NOT NULL DEFAULT 1470,
    `rest_days` JSON NOT NULL COMMENT 'JSON array of day numbers [0] Sunday',
    `target_role` VARCHAR(150) DEFAULT 'Laravel Developer',
    `target_locations` VARCHAR(255) DEFAULT 'Noida, Gurgaon',
    `theme` VARCHAR(20) DEFAULT 'dark',
    `sound_enabled` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_user_settings_user` (`user_id`),
    CONSTRAINT `fk_settings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
