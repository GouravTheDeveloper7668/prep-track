-- =====================================================================
-- PrepTrack — Complete Database Schema & Initial Data
-- My 120-Day Interview Journey (MySQL / MariaDB)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `preptrack` 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

USE `preptrack`;

-- 1. Users Table (Dynamic Authentication)
CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(100) DEFAULT 'Candidate',
    `target_role` VARCHAR(150) DEFAULT 'Laravel Developer',
    `remember_token` VARCHAR(100) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_users_username` (`username`),
    UNIQUE KEY `uk_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. User Settings Table
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

-- 3. Subjects Table
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

-- 4. Tasks Table
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

-- 5. Routines Table
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

-- 6. Calendar Annotations Table
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

-- 7. Festivals & Holidays Table
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

-- 8. Daily Reviews and Study Logs Tables
CREATE TABLE IF NOT EXISTS `daily_reviews` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `review_date` DATE NOT NULL,
    `learned_today` TEXT NULL,
    `difficulties` TEXT NULL,
    `to_revise` TEXT NULL,
    `to_improve` TEXT NULL,
    `confidence_rating` TINYINT UNSIGNED NOT NULL DEFAULT 3,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_reviews_user_date` (`user_id`, `review_date`),
    CONSTRAINT `fk_reviews_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `study_logs` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `task_id` VARCHAR(64) NULL,
    `subject_id` VARCHAR(50) NULL,
    `log_date` DATE NOT NULL,
    `minutes_spent` INT UNSIGNED NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_study_logs_user_date` (`user_id`, `log_date`),
    CONSTRAINT `fk_study_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrations Tracking Table
CREATE TABLE IF NOT EXISTS `migrations` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `migration` VARCHAR(255) NOT NULL UNIQUE,
    `batch` INT UNSIGNED NOT NULL,
    `applied_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Initial Seed Data
INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `full_name`, `target_role`)
VALUES (
    1,
    'sonu',
    'sonu@preptrack.local',
    '$2y$10$X3XE9PdIsY28KyaAbp504uZKsiFNB8o20cYlbkqXWZiaxr/24Uteu',
    'Sonu Kumar',
    'Laravel Developer'
)
ON DUPLICATE KEY UPDATE `username` = VALUES(`username`);

INSERT INTO `user_settings` (
    `user_id`, `start_date`, `target_date`, `goal_days`, `daily_target_minutes`, `weekly_target_minutes`, `rest_days`, `target_role`, `target_locations`, `theme`, `sound_enabled`
) VALUES (
    1,
    CURDATE(),
    DATE_ADD(CURDATE(), INTERVAL 119 DAY),
    120,
    210,
    1470,
    JSON_ARRAY(0),
    'Laravel Developer',
    'Noida, Gurgaon',
    'dark',
    0
)
ON DUPLICATE KEY UPDATE `goal_days` = VALUES(`goal_days`);

INSERT INTO `subjects` (`id`, `user_id`, `name`, `daily_minutes`, `color`, `icon`, `is_archived`) VALUES
('s0', 1, 'English Communication', 30, '#22c55e', 'fa-comments', 0),
('s1', 1, 'DSA and Pattern Practice', 45, '#f59e0b', 'fa-code', 0),
('s2', 1, 'SQL', 30, '#3b82f6', 'fa-database', 0),
('s3', 1, 'Laravel Architecture', 60, '#ef4444', 'fa-layer-group', 0),
('s4', 1, 'Laravel Technical and Theoretical Questions', 30, '#a855f7', 'fa-circle-question', 0),
('s5', 1, 'Scenario-Based Discussions', 15, '#14b8a6', 'fa-comments-dollar', 0)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `festivals_holidays` (`id`, `user_id`, `name`, `holiday_date`, `description`, `is_annual`, `policy`, `is_sample`) VALUES
('h1', 1, 'Republic Day', CONCAT(YEAR(CURDATE()), '-01-26'), 'National Holiday', 1, 'Full Holiday', 1),
('h2', 1, 'Independence Day', CONCAT(YEAR(CURDATE()), '-08-15'), 'National Holiday', 1, 'Full Holiday', 1),
('h3', 1, 'Gandhi Jayanti', CONCAT(YEAR(CURDATE()), '-10-02'), 'National Holiday', 1, 'Full Holiday', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `tasks` (`id`, `user_id`, `subject_id`, `title`, `description`, `planned_date`, `duration_minutes`, `priority`, `status`, `notes`, `is_sample`) VALUES
('t1', 1, 's1', 'Right Angle Triangle pattern', 'Nested loop logic in PHP', CURDATE(), 45, 'Medium', 'Pending', '', 1),
('t2', 1, 's1', 'Reverse Right Angle Triangle', 'Pattern practice with space padding', CURDATE(), 45, 'Medium', 'Pending', '', 1),
('t3', 1, 's2', 'SQL SELECT and WHERE queries', 'Core SQL filtering and indexing basics', CURDATE(), 30, 'Medium', 'Pending', '', 1),
('t4', 1, 's2', 'SQL JOIN practice', 'INNER, LEFT, RIGHT, and FULL OUTER joins', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 30, 'Medium', 'Pending', '', 1),
('t5', 1, 's3', 'Laravel request lifecycle', 'public/index.php -> HTTP Kernel -> Service Providers -> Routing -> Middleware -> Controller', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 60, 'High', 'Pending', '', 1),
('t6', 1, 's3', 'MVC architecture explanation', 'Model-View-Controller separation of concerns in Laravel', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 60, 'Medium', 'Pending', '', 1),
('t7', 1, 's4', 'Synchronous vs asynchronous discussion', 'Queues, jobs, event listeners in Laravel', DATE_ADD(CURDATE(), INTERVAL 2 DAY), 30, 'Medium', 'Pending', '', 1),
('t8', 1, 's5', 'Checkout performance investigation', 'How to debug slow queries and high server load', DATE_ADD(CURDATE(), INTERVAL 2 DAY), 30, 'High', 'Pending', '', 1),
('t9', 1, 's2', 'Database indexing', 'B-Tree vs Hash index, compound index benefits', DATE_ADD(CURDATE(), INTERVAL 3 DAY), 30, 'Medium', 'Pending', '', 1),
('t10', 1, 's3', 'Eloquent N+1 query problem', 'Eager loading using with() vs lazy loading', DATE_ADD(CURDATE(), INTERVAL 3 DAY), 30, 'High', 'Pending', '', 1)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);
