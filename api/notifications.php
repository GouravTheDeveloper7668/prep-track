<?php
/**
 * PrepTrack — Real-time Notification Management API
 * Saves FCM tokens, checks due reminders, and sends Chrome push notifications.
 */

header('Content-Type: application/json; charset=utf-8');
session_start();

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/firebase.php';

// Detect active user
$userId = $_SESSION['user_id'] ?? null;
if (!$userId) {
    $u = checkRememberToken();
    if ($u) {
        $userId = $u['id'];
    }
}

// Fallback to default user 1 for initial setup if not logged in yet
if (!$userId) {
    $userId = 1;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Support JSON payload
$raw = file_get_contents('php://input');
$jsonBody = [];
if (!empty($raw)) {
    $decoded = json_decode($raw, true);
    if (is_array($decoded)) {
        $jsonBody = $decoded;
    }
}
$req = array_merge($_GET, $_POST, $jsonBody);
if (empty($action) && isset($req['action'])) {
    $action = $req['action'];
}

try {
    $db = getDB();

    switch ($action) {
        case 'save_token':
            $token = trim($req['token'] ?? '');
            if (empty($token)) {
                jsonResponse(['success' => false, 'message' => 'Token cannot be empty.'], 400);
            }

            $tokenHash = hash('sha256', $token);
            $deviceInfo = $_SERVER['HTTP_USER_AGENT'] ?? 'Chrome Desktop';

            $stmt = $db->prepare("
                INSERT INTO user_fcm_tokens (user_id, token, token_hash, device_info, updated_at)
                VALUES (?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                token = VALUES(token),
                device_info = VALUES(device_info),
                updated_at = NOW()
            ");
            $stmt->execute([$userId, $token, $tokenHash, $deviceInfo]);

            jsonResponse([
                'success' => true,
                'message' => 'FCM Device Token registered successfully for real-time notifications!',
                'user_id' => $userId
            ]);
            break;

        case 'check_due':
            // Check for tasks where:
            // 1. planned_date is today
            // 2. reminder_time is set
            // 3. reminder_time <= current time
            // 4. is_notified = 0 (NOT YET NOTIFIED)
            // 5. status is Pending or In Progress (not Completed or Cancelled)
            $today = date('Y-m-d');
            $currentTime = date('H:i');

            $stmt = $db->prepare("
                SELECT t.id, t.title, t.description, t.subject_id, t.planned_date, t.start_time, t.reminder_time, t.duration_minutes, s.name as subject_name, s.color as subject_color
                FROM tasks t
                LEFT JOIN subjects s ON s.id = t.subject_id AND s.user_id = t.user_id
                WHERE t.user_id = ?
                  AND t.planned_date = ?
                  AND t.reminder_time IS NOT NULL 
                  AND t.reminder_time != ''
                  AND t.reminder_time <= ?
                  AND t.is_notified = 0
                  AND t.status NOT IN ('Completed', 'Cancelled')
                ORDER BY t.reminder_time ASC
            ");
            $stmt->execute([$userId, $today, $currentTime]);
            $dueTasks = $stmt->fetchAll();

            $marked = [];
            if (!empty($dueTasks)) {
                $updateStmt = $db->prepare("UPDATE tasks SET is_notified = 1, notified_at = NOW() WHERE id = ? AND user_id = ?");
                $logStmt = $db->prepare("INSERT INTO notification_logs (user_id, task_id, title, body, channel, status) VALUES (?, ?, ?, ?, 'browser_chrome', 'delivered')");

                foreach ($dueTasks as $t) {
                    // Mark as notified so it NEVER repeats
                    $updateStmt->execute([$t['id'], $userId]);

                    $title = "⏰ Task Reminder: " . $t['title'];
                    $body = "Scheduled for " . ($t['start_time'] ?: $t['reminder_time']) . " (" . ($t['subject_name'] ?: 'Study') . " · " . $t['duration_minutes'] . "m)";
                    $logStmt->execute([$userId, $t['id'], $title, $body]);

                    $marked[] = [
                        'id' => $t['id'],
                        'title' => $title,
                        'body' => $body,
                        'start_time' => $t['start_time'],
                        'reminder_time' => $t['reminder_time'],
                        'duration' => $t['duration_minutes'],
                        'subject' => $t['subject_name']
                    ];
                }
            }

            jsonResponse([
                'success' => true,
                'count' => count($marked),
                'tasks' => $marked,
                'checked_at' => $currentTime
            ]);
            break;

        case 'test':
            // Send test notification to registered FCM tokens
            $stmt = $db->prepare("SELECT token FROM user_fcm_tokens WHERE user_id = ?");
            $stmt->execute([$userId]);
            $tokens = $stmt->fetchAll(PDO::FETCH_COLUMN);

            $title = "🔔 PrepTrack Test Notification";
            $body = "Chrome notifications are working perfectly! You will receive timely alerts before your study tasks.";

            $fcmResult = null;
            if (!empty($tokens)) {
                $fcmResult = sendFcmNotification($tokens, $title, $body, ['type' => 'test']);
            }

            jsonResponse([
                'success' => true,
                'message' => 'Test notification prepared.',
                'title' => $title,
                'body' => $body,
                'registered_tokens_count' => count($tokens),
                'fcm_result' => $fcmResult
            ]);
            break;

        case 'status':
            $stmt = $db->prepare("SELECT COUNT(*) FROM user_fcm_tokens WHERE user_id = ?");
            $stmt->execute([$userId]);
            $count = (int)$stmt->fetchColumn();

            jsonResponse([
                'success' => true,
                'registered_devices' => $count,
                'firebase_configured' => !empty(getFirebaseConfig()['apiKey'])
            ]);
            break;

        default:
            jsonResponse(['success' => false, 'message' => 'Invalid action.'], 400);
            break;
    }
} catch (Exception $e) {
    jsonResponse(['success' => false, 'message' => 'Notification API Error: ' . $e->getMessage()], 500);
}
