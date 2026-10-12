-- Migration 005: Create routines table
-- PrepTrack — Daily and Weekly Routine Builder

CREATE TABLE IF NOT EXISTS `routines` (
    `id` VARCHAR(64) NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `routine_type` ENUM('daily', 'weekly') NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `day_of_week` TINYINT NULL COMMENT 'For weekly routines: 0=Sun, 1=Mon, ..., 6=Sat',
    `is_rest_day` TINYINT(1) DEFAULT 0,
    `items` JSON NOT NULL COMMENT 'Array of tasks [{id, subject, title, minutes, time}]',
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_routines_user_type` (`user_id`, `routine_type`),
    CONSTRAINT `fk_routines_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
