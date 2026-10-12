-- Migration 003: Create subjects table
-- PrepTrack — 6 Preconfigured & Customizable Study Subjects

CREATE TABLE IF NOT EXISTS `subjects` (
    `id` VARCHAR(50) NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `daily_minutes` INT NOT NULL DEFAULT 30,
    `color` VARCHAR(20) NOT NULL DEFAULT '#7c5cff',
    `icon` VARCHAR(50) NOT NULL DEFAULT 'fa-book',
    `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`, `user_id`),
    KEY `idx_subjects_user` (`user_id`),
    CONSTRAINT `fk_subjects_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
