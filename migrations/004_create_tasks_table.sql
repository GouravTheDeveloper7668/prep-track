-- Migration 004: Create tasks table
-- PrepTrack — Daily Task Manager and Checklist

CREATE TABLE IF NOT EXISTS `tasks` (
    `id` VARCHAR(64) NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `subject_id` VARCHAR(50) NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `planned_date` DATE NOT NULL,
    `start_time` VARCHAR(10) NULL,
    `duration_minutes` INT NOT NULL DEFAULT 30,
    `actual_minutes` INT NOT NULL DEFAULT 0,
    `priority` ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
    `status` ENUM('Pending', 'In Progress', 'Completed', 'Missed', 'Cancelled') NOT NULL DEFAULT 'Pending',
    `checklist` JSON NULL COMMENT 'Array of checklist items [{t: text, d: boolean}]',
    `notes` TEXT NULL COMMENT 'What was learned / interview talking points',
    `reminder_time` VARCHAR(10) NULL,
    `is_sample` TINYINT(1) NOT NULL DEFAULT 0,
    `completed_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_tasks_user_date` (`user_id`, `planned_date`),
    KEY `idx_tasks_user_status` (`user_id`, `status`),
    KEY `idx_tasks_subject` (`subject_id`),
    CONSTRAINT `fk_tasks_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
