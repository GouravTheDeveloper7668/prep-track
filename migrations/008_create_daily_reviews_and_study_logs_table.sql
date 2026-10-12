-- Migration 008: Create daily_reviews and study_logs tables
-- PrepTrack — Day-End Self Reviews & Actual Study Logs

CREATE TABLE IF NOT EXISTS `daily_reviews` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `review_date` DATE NOT NULL,
    `learned_today` TEXT NULL COMMENT 'What did I learn today?',
    `difficulties` TEXT NULL COMMENT 'What was difficult?',
    `to_revise` TEXT NULL COMMENT 'What should I revise?',
    `to_improve` TEXT NULL COMMENT 'What will I improve tomorrow?',
    `confidence_rating` TINYINT UNSIGNED NOT NULL DEFAULT 3 COMMENT 'Confidence 1 to 5',
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
