<?php
/**
 * PrepTrack — Dynamic MySQL Data Sync API
 * Allows client-side state and backups to sync directly with MySQL database.
 */

header('Content-Type: application/json; charset=utf-8');
session_start();

require_once __DIR__ . '/../config/db.php';

// Check if user is authenticated
$userId = $_SESSION['user_id'] ?? null;
if (!$userId) {
    // Check remember token
    $user = checkRememberToken();
    if ($user) {
        $userId = $user['id'];
    }
}

if (!$userId) {
    jsonResponse(['success' => false, 'message' => 'Unauthorized. Please login.'], 401);
}

$action = $_GET['action'] ?? $_POST['action'] ?? 'load';

try {
    $db = getDB();

    if ($action === 'load') {
        // Load settings
        $stmt = $db->prepare("SELECT * FROM user_settings WHERE user_id = ? LIMIT 1");
        $stmt->execute([$userId]);
        $settingsRow = $stmt->fetch();
        
        $settings = [
            'start' => $settingsRow['start_date'] ?? date('Y-m-d'),
            'goal' => (int)($settingsRow['goal_days'] ?? 120),
            'target' => $settingsRow['target_date'] ?? date('Y-m-d', strtotime('+119 days')),
            'daily' => (int)($settingsRow['daily_target_minutes'] ?? 210),
            'weekly' => (int)($settingsRow['weekly_target_minutes'] ?? 1470),
            'rest' => !empty($settingsRow['rest_days']) ? json_decode($settingsRow['rest_days'], true) : [0],
            'role' => $settingsRow['target_role'] ?? 'Laravel Developer',
            'locations' => $settingsRow['target_locations'] ?? 'Noida, Gurgaon',
            'theme' => $settingsRow['theme'] ?? 'dark',
            'sound' => (bool)($settingsRow['sound_enabled'] ?? false),
        ];

        // Load subjects
        $stmt = $db->prepare("SELECT id, name, daily_minutes as minutes, color, icon, (is_archived = 1) as archived FROM subjects WHERE user_id = ? ORDER BY id ASC");
        $stmt->execute([$userId]);
        $subjects = $stmt->fetchAll();

        // Load tasks
        $stmt = $db->prepare("SELECT id, subject_id as subject, title, description, planned_date as date, start_time as time, duration_minutes as duration, actual_minutes as actual, priority, status, checklist, notes, reminder_time as reminder, (is_sample = 1) as sample, completed_at as completedAt, (is_notified = 1) as is_notified FROM tasks WHERE user_id = ? ORDER BY planned_date ASC");
        $stmt->execute([$userId]);
        $tasks = $stmt->fetchAll();
        foreach ($tasks as &$t) {
            $t['duration'] = (int)$t['duration'];
            $t['actual'] = (int)$t['actual'];
            $t['checklist'] = !empty($t['checklist']) ? json_decode($t['checklist'], true) : [];
        }

        // Load routines
        $stmt = $db->prepare("SELECT id, routine_type, name, day_of_week, is_rest_day, items FROM routines WHERE user_id = ?");
        $stmt->execute([$userId]);
        $routinesRows = $stmt->fetchAll();
        $weekly = [];
        $daily = [];
        foreach ($routinesRows as $r) {
            $items = !empty($r['items']) ? json_decode($r['items'], true) : [];
            if ($r['routine_type'] === 'weekly') {
                $weekly[] = [
                    'id' => $r['id'],
                    'name' => $r['name'],
                    'days' => $items
                ];
            } else {
                $daily = $items;
            }
        }

        // Load calendar annotations
        $stmt = $db->prepare("SELECT date, type, note FROM calendar_annotations WHERE user_id = ?");
        $stmt->execute([$userId]);
        $annRows = $stmt->fetchAll();
        $ann = [];
        foreach ($annRows as $a) {
            $ann[$a['date']] = [
                'type' => $a['type'],
                'note' => $a['note'] ?? ''
            ];
        }

        // Load holidays
        $stmt = $db->prepare("SELECT id, name, holiday_date as date, description, (is_annual = 1) as annual, policy, (is_sample = 1) as sample FROM festivals_holidays WHERE user_id = ?");
        $stmt->execute([$userId]);
        $holidays = $stmt->fetchAll();

        // Load daily reviews
        $stmt = $db->prepare("SELECT review_date, learned_today as learned, difficulties as hard, to_revise as revise, to_improve as improve, confidence_rating as conf FROM daily_reviews WHERE user_id = ?");
        $stmt->execute([$userId]);
        $reviewRows = $stmt->fetchAll();
        $reviews = [];
        foreach ($reviewRows as $rev) {
            $reviews[$rev['review_date']] = [
                'learned' => $rev['learned'],
                'hard'    => $rev['hard'],
                'revise'  => $rev['revise'],
                'improve' => $rev['improve'],
                'conf'    => (int)$rev['conf']
            ];
        }

        jsonResponse([
            'success'  => true,
            'source'   => 'mysql',
            'schema'   => 1,
            'settings' => $settings,
            'subjects' => $subjects,
            'tasks'    => $tasks,
            'daily'    => $daily,
            'weekly'   => $weekly,
            'ann'      => $ann,
            'holidays' => $holidays,
            'reviews'  => $reviews,
            'logs'     => [],
            'savedAt'  => date('c')
        ]);
    }

    if ($action === 'save') {
        $raw = file_get_contents('php://input');
        $payload = json_decode($raw, true);

        if (!$payload || !is_array($payload)) {
            jsonResponse(['success' => false, 'message' => 'Invalid JSON payload.'], 400);
        }

        $db->beginTransaction();

        // 1. Sync Settings
        if (!empty($payload['settings'])) {
            $s = $payload['settings'];
            $stmt = $db->prepare("
                INSERT INTO user_settings 
                (user_id, start_date, target_date, goal_days, daily_target_minutes, weekly_target_minutes, rest_days, target_role, target_locations, theme, sound_enabled)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                start_date = VALUES(start_date),
                target_date = VALUES(target_date),
                goal_days = VALUES(goal_days),
                daily_target_minutes = VALUES(daily_target_minutes),
                weekly_target_minutes = VALUES(weekly_target_minutes),
                rest_days = VALUES(rest_days),
                target_role = VALUES(target_role),
                target_locations = VALUES(target_locations),
                theme = VALUES(theme),
                sound_enabled = VALUES(sound_enabled)
            ");
            $stmt->execute([
                $userId,
                $s['start'] ?? date('Y-m-d'),
                $s['target'] ?? date('Y-m-d', strtotime('+119 days')),
                $s['goal'] ?? 120,
                $s['daily'] ?? 210,
                $s['weekly'] ?? 1470,
                json_encode($s['rest'] ?? [0]),
                $s['role'] ?? 'Laravel Developer',
                $s['locations'] ?? 'Noida, Gurgaon',
                $s['theme'] ?? 'dark',
                !empty($s['sound']) ? 1 : 0
            ]);
        }

        // 2. Sync Subjects
        if (isset($payload['subjects']) && is_array($payload['subjects'])) {
            $subStmt = $db->prepare("
                INSERT INTO subjects (id, user_id, name, daily_minutes, color, icon, is_archived)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                daily_minutes = VALUES(daily_minutes),
                color = VALUES(color),
                icon = VALUES(icon),
                is_archived = VALUES(is_archived)
            ");
            foreach ($payload['subjects'] as $sub) {
                if (empty($sub['id'])) continue;
                $subStmt->execute([
                    $sub['id'],
                    $userId,
                    $sub['name'] ?? 'Subject',
                    $sub['minutes'] ?? 30,
                    $sub['color'] ?? '#7c5cff',
                    $sub['icon'] ?? 'fa-book',
                    !empty($sub['archived']) ? 1 : 0
                ]);
            }
        }

        // 3. Sync Tasks
        if (isset($payload['tasks']) && is_array($payload['tasks'])) {
            $incomingIds = [];
            $taskStmt = $db->prepare("
                INSERT INTO tasks 
                (id, user_id, subject_id, title, description, planned_date, start_time, duration_minutes, actual_minutes, priority, status, checklist, notes, reminder_time, is_sample, completed_at, is_notified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                subject_id = VALUES(subject_id),
                title = VALUES(title),
                description = VALUES(description),
                planned_date = VALUES(planned_date),
                start_time = VALUES(start_time),
                duration_minutes = VALUES(duration_minutes),
                actual_minutes = VALUES(actual_minutes),
                priority = VALUES(priority),
                status = VALUES(status),
                checklist = VALUES(checklist),
                notes = VALUES(notes),
                reminder_time = VALUES(reminder_time),
                completed_at = VALUES(completed_at),
                is_notified = IF(VALUES(reminder_time) != reminder_time OR VALUES(planned_date) != planned_date, 0, is_notified)
            ");

            foreach ($payload['tasks'] as $t) {
                if (empty($t['id']) || empty($t['title']) || empty($t['date'])) continue;
                $incomingIds[] = $t['id'];
                $isNotified = !empty($t['is_notified']) ? 1 : 0;
                $taskStmt->execute([
                    $t['id'],
                    $userId,
                    $t['subject'] ?? null,
                    $t['title'],
                    $t['description'] ?? '',
                    $t['date'],
                    $t['time'] ?? null,
                    $t['duration'] ?? 30,
                    $t['actual'] ?? 0,
                    $t['priority'] ?? 'Medium',
                    $t['status'] ?? 'Pending',
                    !empty($t['checklist']) ? json_encode($t['checklist']) : null,
                    $t['notes'] ?? '',
                    $t['reminder'] ?? null,
                    !empty($t['sample']) ? 1 : 0,
                    !empty($t['completedAt']) ? date('Y-m-d H:i:s', strtotime($t['completedAt'])) : null,
                    $isNotified
                ]);
            }

            // Clean up deleted tasks
            if (!empty($incomingIds)) {
                $inClause = implode(',', array_fill(0, count($incomingIds), '?'));
                $delStmt = $db->prepare("DELETE FROM tasks WHERE user_id = ? AND id NOT IN ($inClause)");
                $delStmt->execute(array_merge([$userId], $incomingIds));
            } else {
                $db->prepare("DELETE FROM tasks WHERE user_id = ?")->execute([$userId]);
            }
        }

        // 4. Sync Calendar Annotations
        if (isset($payload['ann']) && is_array($payload['ann'])) {
            $db->prepare("DELETE FROM calendar_annotations WHERE user_id = ?")->execute([$userId]);
            $annStmt = $db->prepare("INSERT INTO calendar_annotations (user_id, date, type, note) VALUES (?, ?, ?, ?)");
            foreach ($payload['ann'] as $date => $item) {
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) continue;
                $annStmt->execute([
                    $userId,
                    $date,
                    $item['type'] ?? 'Normal',
                    $item['note'] ?? ''
                ]);
            }
        }

        // 5. Sync Holidays
        if (isset($payload['holidays']) && is_array($payload['holidays'])) {
            $db->prepare("DELETE FROM festivals_holidays WHERE user_id = ?")->execute([$userId]);
            $holStmt = $db->prepare("
                INSERT INTO festivals_holidays (id, user_id, name, holiday_date, description, is_annual, policy, is_sample)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            foreach ($payload['holidays'] as $h) {
                if (empty($h['id']) || empty($h['date'])) continue;
                $holStmt->execute([
                    $h['id'],
                    $userId,
                    $h['name'] ?? 'Holiday',
                    $h['date'],
                    $h['description'] ?? '',
                    !empty($h['annual']) ? 1 : 0,
                    $h['policy'] ?? 'Full Holiday',
                    !empty($h['sample']) ? 1 : 0
                ]);
            }
        }

        // 6. Sync Daily Reviews
        if (isset($payload['reviews']) && is_array($payload['reviews'])) {
            $db->prepare("DELETE FROM daily_reviews WHERE user_id = ?")->execute([$userId]);
            $revStmt = $db->prepare("
                INSERT INTO daily_reviews (user_id, review_date, learned_today, difficulties, to_revise, to_improve, confidence_rating)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            foreach ($payload['reviews'] as $revDate => $rev) {
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $revDate)) continue;
                $revStmt->execute([
                    $userId,
                    $revDate,
                    $rev['learned'] ?? '',
                    $rev['hard'] ?? '',
                    $rev['revise'] ?? '',
                    $rev['improve'] ?? '',
                    $rev['conf'] ?? 3
                ]);
            }
        }

        $db->commit();

        // Also save to data/ directory for backup retention
        $todayStr = date('Y-m-d');
        $backupDir = __DIR__ . '/../data';
        if (!is_dir($backupDir)) {
            @mkdir($backupDir, 0777, true);
        }
        $backupFile = $backupDir . '/preptrack-' . $todayStr . '.json';
        @file_put_contents($backupFile, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        jsonResponse([
            'success' => true,
            'message' => 'Successfully synced with MySQL database and saved backup.',
            'backupFile' => 'data/preptrack-' . $todayStr . '.json'
        ]);
    }

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    jsonResponse(['success' => false, 'message' => 'Sync error: ' . $e->getMessage()], 500);
}
