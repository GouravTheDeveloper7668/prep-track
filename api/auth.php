<?php
/**
 * PrepTrack — Dynamic MySQL Authentication API
 * Handles Login, Registration, Session Check, and Logout
 */

header('Content-Type: application/json; charset=utf-8');
session_start();

require_once __DIR__ . '/../config/db.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Support JSON payload
$rawInput = file_get_contents('php://input');
$jsonBody = [];
if (!empty($rawInput)) {
    $decoded = json_decode($rawInput, true);
    if (is_array($decoded)) {
        $jsonBody = $decoded;
    }
}

// Merge params
$req = array_merge($_GET, $_POST, $jsonBody);
if (empty($action) && isset($req['action'])) {
    $action = $req['action'];
}

try {
    $db = getDB();

    switch ($action) {
        case 'login':
            $username = trim($req['username'] ?? $req['u'] ?? '');
            $password = (string)($req['password'] ?? $req['p'] ?? '');
            $remember = !empty($req['remember'] ?? $req['r'] ?? false);

            if (empty($username) || empty($password)) {
                jsonResponse(['success' => false, 'message' => 'Please enter both username/email and password.'], 400);
            }

            // Look up user in MySQL
            $stmt = $db->prepare("SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1");
            $stmt->execute([$username, $username]);
            $user = $stmt->fetch();

            if (!$user || !password_verify($password, $user['password_hash'])) {
                jsonResponse(['success' => false, 'message' => 'Invalid username or password.'], 401);
            }

            // Always establish 30-day persistent login session in MySQL and Cookie
            set30DayLoginSession($user);

            jsonResponse([
                'success' => true,
                'message' => 'Login successful! Welcome back, ' . htmlspecialchars($user['username']),
                'user' => [
                    'id'        => (int)$user['id'],
                    'username'  => $user['username'],
                    'email'     => $user['email'],
                    'full_name' => $user['full_name'],
                ],
                'redirect' => 'index.php'
            ]);
            break;

        case 'register':
            $username = trim($req['username'] ?? '');
            $email = trim($req['email'] ?? '');
            $password = (string)($req['password'] ?? '');
            $fullName = trim($req['full_name'] ?? 'Candidate');

            if (strlen($username) < 3) {
                jsonResponse(['success' => false, 'message' => 'Username must be at least 3 characters.'], 400);
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                jsonResponse(['success' => false, 'message' => 'Please provide a valid email address.'], 400);
            }
            if (strlen($password) < 6) {
                jsonResponse(['success' => false, 'message' => 'Password must be at least 6 characters long.'], 400);
            }

            // Check if username or email already taken
            $checkStmt = $db->prepare("SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1");
            $checkStmt->execute([$username, $email]);
            if ($checkStmt->fetch()) {
                jsonResponse(['success' => false, 'message' => 'Username or email is already registered.'], 409);
            }

            // Create new user in MySQL
            $hash = password_hash($password, PASSWORD_BCRYPT);
            $insStmt = $db->prepare("INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)");
            $insStmt->execute([$username, $email, $hash, $fullName]);
            $newId = (int)$db->lastInsertId();

            // Seed default settings for this new user
            $setStmt = $db->prepare("
                INSERT INTO user_settings 
                (user_id, start_date, target_date, goal_days, daily_target_minutes, weekly_target_minutes, rest_days, target_role, target_locations)
                VALUES (?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 119 DAY), 120, 210, 1470, JSON_ARRAY(0), 'Laravel Developer', 'Noida, Gurgaon')
            ");
            $setStmt->execute([$newId]);

            // Seed default 6 subjects
            $subStmt = $db->prepare("
                INSERT INTO subjects (id, user_id, name, daily_minutes, color, icon, is_archived) VALUES
                ('s0', ?, 'English Communication', 30, '#22c55e', 'fa-comments', 0),
                ('s1', ?, 'DSA and Pattern Practice', 45, '#f59e0b', 'fa-code', 0),
                ('s2', ?, 'SQL', 30, '#3b82f6', 'fa-database', 0),
                ('s3', ?, 'Laravel Architecture', 60, '#ef4444', 'fa-layer-group', 0),
                ('s4', ?, 'Laravel Technical and Theoretical Questions', 30, '#a855f7', 'fa-circle-question', 0),
                ('s5', ?, 'Scenario-Based Discussions', 15, '#14b8a6', 'fa-comments-dollar', 0)
            ");
            $subStmt->execute([$newId, $newId, $newId, $newId, $newId, $newId]);

            // Auto-login new user with 30-day persistent session
            set30DayLoginSession([
                'id' => $newId,
                'username' => $username,
                'email' => $email,
                'full_name' => $fullName
            ]);

            jsonResponse([
                'success' => true,
                'message' => 'Account created successfully! Welcome to PrepTrack.',
                'user' => [
                    'id' => $newId,
                    'username' => $username,
                    'email' => $email,
                    'full_name' => $fullName
                ],
                'redirect' => 'index.php'
            ], 201);
            break;

        case 'check':
            $user = checkRememberToken();
            if ($user || !empty($_SESSION['user_id'])) {
                jsonResponse([
                    'authenticated' => true,
                    'user' => [
                        'id' => $_SESSION['user_id'] ?? $user['id'],
                        'username' => $_SESSION['username'] ?? $user['username'],
                        'email' => $_SESSION['email'] ?? $user['email'] ?? '',
                        'full_name' => $_SESSION['full_name'] ?? $user['full_name'] ?? 'Candidate'
                    ]
                ]);
            } else {
                jsonResponse(['authenticated' => false], 401);
            }
            break;

        case 'logout':
            clearLoginSession($_SESSION['user_id'] ?? null);

            jsonResponse([
                'success' => true,
                'message' => 'Logged out successfully.',
                'redirect' => 'login.php'
            ]);

            jsonResponse([
                'success' => true,
                'message' => 'Logged out successfully.',
                'redirect' => 'login.php'
            ]);
            break;

        default:
            jsonResponse(['success' => false, 'message' => 'Unknown action.'], 400);
            break;
    }
} catch (Exception $e) {
    jsonResponse(['success' => false, 'message' => 'Server error: ' . $e->getMessage()], 500);
}
