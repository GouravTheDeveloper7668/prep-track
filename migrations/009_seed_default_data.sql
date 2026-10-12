-- Migration 009: Seed initial demo user and default curriculum data
-- PrepTrack — Initial dynamic user `sonu` with password `Prep@2026`

-- 1. Insert default user (sonu / Prep@2026)
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

-- 2. Insert default user settings for 120-Day Interview Preparation
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

-- 3. Insert 6 Preconfigured Subjects (Section 5 of project.txt)
INSERT INTO `subjects` (`id`, `user_id`, `name`, `daily_minutes`, `color`, `icon`, `is_archived`) VALUES
('s0', 1, 'English Communication', 30, '#22c55e', 'fa-comments', 0),
('s1', 1, 'DSA and Pattern Practice', 45, '#f59e0b', 'fa-code', 0),
('s2', 1, 'SQL', 30, '#3b82f6', 'fa-database', 0),
('s3', 1, 'Laravel Architecture', 60, '#ef4444', 'fa-layer-group', 0),
('s4', 1, 'Laravel Technical and Theoretical Questions', 30, '#a855f7', 'fa-circle-question', 0),
('s5', 1, 'Scenario-Based Discussions', 15, '#14b8a6', 'fa-comments-dollar', 0)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 4. Insert Default Holidays / Festivals (Section 9 & 16 of project.txt)
INSERT INTO `festivals_holidays` (`id`, `user_id`, `name`, `holiday_date`, `description`, `is_annual`, `policy`, `is_sample`) VALUES
('h1', 1, 'Republic Day', CONCAT(YEAR(CURDATE()), '-01-26'), 'National Holiday', 1, 'Full Holiday', 1),
('h2', 1, 'Independence Day', CONCAT(YEAR(CURDATE()), '-08-15'), 'National Holiday', 1, 'Full Holiday', 1),
('h3', 1, 'Gandhi Jayanti', CONCAT(YEAR(CURDATE()), '-10-02'), 'National Holiday', 1, 'Full Holiday', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 5. Insert Sample Tasks (Section 16 of project.txt)
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
