<?php
/**
 * PrepTrack — 5-Minute Task Reminder Cron Job
 * 
 * Usage in cPanel / Hosting Cron Jobs (every 5 minutes: `* / 5 * * * *`):
 *   /usr/bin/php /home/username/public_html/cron/reminder_cron.php
 * Or on local XAMPP Windows CLI:
 *   php c:\xampp\htdocs\prep\cron\reminder_cron.php
 * Or via HTTP / cURL:
 *   curl "http://localhost/prep/cron/reminder_cron.php?secret=preptrack_cron_2026"
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/firebase.php';

$isCli = (php_sapi_name() === 'cli');

// If accessed via web, verify secret token for security
if (!$isCli) {
    header('Content-Type: application/json; charset=utf-8');
    $config = getFirebaseConfig();
    $expectedSecret = $config['cronSecret'] ?? 'preptrack_cron_2026';
    $givenSecret = $_GET['secret'] ?? $_POST['secret'] ?? '';

    if ($givenSecret !== $expectedSecret) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Unauthorized cron access. Provide valid ?secret= token.',
            'hint'    => 'Example: reminder_cron.php?secret=preptrack_cron_2026'
        ]);
        exit;
    }
}

function logMsg(string $msg, string $type = 'info', bool $isCli = false) {
    if ($isCli) {
        $colors = [
            'success' => "\033[32m[SUCCESS]\033[0m ",
            'error'   => "\033[31m[ERROR]\033[0m ",
            'warn'    => "\033[33m[WARNING]\033[0m ",
            'info'    => "\033[36m[INFO]\033[0m ",
            'head'    => "\033[1;35m===\033[0m "
        ];
        echo ($colors[$type] ?? '') . $msg . PHP_EOL;
    }
}

$nowDate = date('Y-m-d');
$nowTime = date('H:i');
$timestampStr = date('Y-m-d H:i:s');

logMsg("Running PrepTrack Reminder Cron Job at $timestampStr (Current time: $nowTime)", 'head', $isCli);

$processed = [];
$errors = [];

try {
    $db = getDB();

    // 1. Query all tasks due for reminder:
    // - Planned date is today
    // - Has a reminder time set
    // - Reminder time has been reached (reminder_time <= current time)
    // - is_notified = 0 (Has NOT been notified yet)
    // - Status is not Completed or Cancelled
    $query = "
        SELECT t.id, t.user_id, t.title, t.description, t.planned_date, t.start_time, t.reminder_time, t.duration_minutes,
               u.username, u.email,
               s.name as subject_name, s.color as subject_color, s.icon as subject_icon
        FROM tasks t
        JOIN users u ON u.id = t.user_id
        LEFT JOIN subjects s ON s.id = t.subject_id AND s.user_id = t.user_id
        WHERE t.planned_date = ?
          AND t.reminder_time IS NOT NULL 
          AND t.reminder_time != ''
          AND t.reminder_time <= ?
          AND t.is_notified = 0
          AND t.status NOT IN ('Completed', 'Cancelled')
        ORDER BY t.reminder_time ASC
    ";

    $stmt = $db->prepare($query);
    $stmt->execute([$nowDate, $nowTime]);
    $dueTasks = $stmt->fetchAll();

    if (empty($dueTasks)) {
        logMsg("No tasks due for reminder right now. Checked date: $nowDate, time: $nowTime.", 'info', $isCli);
    } else {
        logMsg("Found " . count($dueTasks) . " task(s) due for reminder!", 'warn', $isCli);

        $updateTaskStmt = $db->prepare("UPDATE tasks SET is_notified = 1, notified_at = NOW() WHERE id = ?");
        $getTokensStmt = $db->prepare("SELECT token FROM user_fcm_tokens WHERE user_id = ?");
        $logNotifStmt = $db->prepare("
            INSERT INTO notification_logs (user_id, task_id, title, body, channel, status, response_payload)
            VALUES (?, ?, ?, ?, 'firebase_fcm', ?, ?)
        ");

        foreach ($dueTasks as $task) {
            $taskId = $task['id'];
            $userId = $task['user_id'];
            $taskTitle = $task['title'];
            $startTime = $task['start_time'] ?: $task['reminder_time'];
            $subjectName = $task['subject_name'] ?: 'PrepTrack';
            $duration = $task['duration_minutes'] ?: 30;

            // Notification message format
            $title = "⏰ Study Reminder: $taskTitle";
            $body = "Due at $startTime ($subjectName · {$duration}m). Consistency builds your 120-day offer!";

            // 2. Fetch user's active FCM device tokens
            $getTokensStmt->execute([$userId]);
            $tokens = $getTokensStmt->fetchAll(PDO::FETCH_COLUMN);

            $fcmStatus = 'no_tokens';
            $responsePayload = null;

            if (!empty($tokens)) {
                // 3. Send Firebase Cloud Messaging push
                $fcmRes = sendFcmNotification($tokens, $title, $body, [
                    'task_id'       => $taskId,
                    'user_id'       => $userId,
                    'start_time'    => $startTime,
                    'reminder_time' => $task['reminder_time'],
                    'subject'       => $subjectName
                ]);

                $fcmStatus = !empty($fcmRes['success']) ? 'sent' : 'failed';
                $responsePayload = json_encode($fcmRes);
                logMsg("Sent FCM Push for '{$taskTitle}' to " . count($tokens) . " device(s) [Status: $fcmStatus]", 'success', $isCli);
            } else {
                logMsg("No FCM device tokens found for user ID {$userId} ({$task['username']}). Marked as notified to avoid duplicate repeat.", 'warn', $isCli);
            }

            // 4. CRITICAL: Mark is_notified = 1 so it NEVER sends again!
            $updateTaskStmt->execute([$taskId]);

            // 5. Record in notification_logs
            $logNotifStmt->execute([$userId, $taskId, $title, $body, $fcmStatus, $responsePayload]);

            $processed[] = [
                'task_id'       => $taskId,
                'title'         => $taskTitle,
                'user'          => $task['username'],
                'reminder_time' => $task['reminder_time'],
                'start_time'    => $startTime,
                'tokens_count'  => count($tokens),
                'fcm_status'    => $fcmStatus
            ];
        }
    }

} catch (Exception $e) {
    $errors[] = $e->getMessage();
    logMsg("Cron error: " . $e->getMessage(), 'error', $isCli);
}

$summary = [
    'success'           => empty($errors),
    'executed_at'       => $timestampStr,
    'checked_date'      => $nowDate,
    'checked_time'      => $nowTime,
    'tasks_processed'   => count($processed),
    'tasks'             => $processed,
    'errors'            => $errors
];

if (!$isCli) {
    echo json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} else {
    echo PHP_EOL . "Cron job completed successfully! (" . count($processed) . " reminders notified)." . PHP_EOL;
}
