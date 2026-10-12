<?php
/**
 * PrepTrack — MySQL Database Connection & 30-Day Session Configuration
 * Uses PDO for secure prepared statements and UTF-8 encoding.
 */

// 30 Days Persistent Session (30 days = 2,592,000 seconds)
define('SESSION_LIFETIME_DAYS', 30);
define('SESSION_LIFETIME_SECONDS', 30 * 86400);

// Configure 30-day session parameters before session_start()
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_lifetime', (string)SESSION_LIFETIME_SECONDS);
    ini_set('session.gc_maxlifetime', (string)SESSION_LIFETIME_SECONDS);
    session_set_cookie_params([
        'lifetime' => SESSION_LIFETIME_SECONDS,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
}

// Environment Detection (Localhost XAMPP vs Production Hostinger)
$httpHost = $_SERVER['HTTP_HOST'] ?? '';
$isLocal = ($httpHost === 'localhost' || $httpHost === '127.0.0.1' || str_starts_with($httpHost, 'localhost:') || (php_sapi_name() === 'cli' && strtoupper(substr(PHP_OS, 0, 3)) === 'WIN'));

if ($isLocal) {
    // Local XAMPP Environment
    define('DB_HOST', '127.0.0.1');
    define('DB_PORT', '3306');
    define('DB_NAME', 'preptrack');
    define('DB_USER', 'root');
    define('DB_PASS', '');
} else {
    // Hostinger Live Production Environment
    define('DB_HOST', 'localhost');
    define('DB_PORT', '3306');
    define('DB_NAME', 'u409719797_prep_track');
    define('DB_USER', 'u409719797_prep_track');
    define('DB_PASS', 'Z2gjqBagG+u');
}

/**
 * Returns a PDO database connection instance.
 * 
 * @return PDO
 */
function getDB(): PDO {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        // Connect directly to the database (Works seamlessly on Hostinger & Localhost)
        $dbDsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
        $pdo = new PDO($dbDsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        // If database doesn't exist yet on local setup, try creating it
        if ($e->getCode() == 1049 || str_contains($e->getMessage(), 'Unknown database')) {
            try {
                $serverDsn = sprintf('mysql:host=%s;port=%s;charset=utf8mb4', DB_HOST, DB_PORT);
                $serverConn = new PDO($serverDsn, DB_USER, DB_PASS, $options);
                $serverConn->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                $pdo = new PDO($dbDsn, DB_USER, DB_PASS, $options);
                return $pdo;
            } catch (Exception $_) {}
        }

        // Return JSON error if request is API, or throw
        if (str_contains($_SERVER['REQUEST_URI'] ?? '', '/api/')) {
            header('Content-Type: application/json; charset=utf-8');
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Database connection failed: ' . $e->getMessage(),
                'hint' => 'Check your database credentials in config/db.php'
            ]);
            exit;
        }
        throw new Exception("Database connection failed: " . $e->getMessage());
    }
}

/**
 * Sets a 30-day persistent login session in MySQL and HTTP-only cookie.
 * 
 * @param array $user User database record
 * @return string The generated remember token
 */
function set30DayLoginSession(array $user): string {
    $db = getDB();
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', time() + SESSION_LIFETIME_SECONDS);

    // Save token and 30-day expiration timestamp in MySQL
    try {
        $stmt = $db->prepare("UPDATE users SET remember_token = ?, remember_token_expires_at = ? WHERE id = ?");
        $stmt->execute([$token, $expiresAt, $user['id']]);
    } catch (Exception $_) {
        // Fallback if remember_token_expires_at column is not yet migrated
        $stmt = $db->prepare("UPDATE users SET remember_token = ? WHERE id = ?");
        $stmt->execute([$token, $user['id']]);
    }

    // Set 30-day HTTP-only persistent cookie
    setcookie('pt_rem', $token, [
        'expires'  => time() + SESSION_LIFETIME_SECONDS,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);

    // Set PHP Session
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    $_SESSION['user_id'] = (int)$user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['full_name'] = $user['full_name'] ?? 'Candidate';
    $_SESSION['logged_at'] = time();

    return $token;
}

/**
 * Validates 30-day remember token and restores session.
 * Automatically logs out if 30 days have elapsed.
 * 
 * @return array|false
 */
function checkRememberToken() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    if (!empty($_SESSION['user_id'])) {
        return ['id' => $_SESSION['user_id'], 'username' => $_SESSION['username'] ?? 'User'];
    }

    if (empty($_COOKIE['pt_rem'])) {
        return false;
    }

    $token = $_COOKIE['pt_rem'];
    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT id, username, email, full_name, remember_token_expires_at FROM users WHERE remember_token = ? LIMIT 1");
        $stmt->execute([$token]);
        $user = $stmt->fetch();

        if ($user) {
            // Check if 30-day period has expired
            if (!empty($user['remember_token_expires_at'])) {
                $expiresTimestamp = strtotime($user['remember_token_expires_at']);
                if ($expiresTimestamp < time()) {
                    // 30 days expired! Auto-logout user
                    $db->prepare("UPDATE users SET remember_token = NULL, remember_token_expires_at = NULL WHERE id = ?")->execute([$user['id']]);
                    setcookie('pt_rem', '', time() - 3600, '/');
                    return false;
                }
            }

            // User is valid and within 30 days -> Restore active session
            $_SESSION['user_id'] = (int)$user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['email'] = $user['email'];
            $_SESSION['full_name'] = $user['full_name'];

            // Refresh cookie for 30 more days
            if (!headers_sent()) {
                setcookie('pt_rem', $token, [
                    'expires'  => time() + SESSION_LIFETIME_SECONDS,
                    'path'     => '/',
                    'httponly' => true,
                    'samesite' => 'Lax'
                ]);
            }

            return $user;
        } else {
            // Invalid / unknown token
            setcookie('pt_rem', '', time() - 3600, '/');
        }
    } catch (Exception $e) {
        return false;
    }

    return false;
}

/**
 * Clear session and remember token on explicit user logout
 */
function clearLoginSession($userId = null) {
    if ($userId) {
        try {
            $db = getDB();
            $db->prepare("UPDATE users SET remember_token = NULL, remember_token_expires_at = NULL WHERE id = ?")->execute([$userId]);
        } catch (Exception $_) {}
    }

    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    @session_destroy();
    setcookie('pt_rem', '', time() - 3600, '/');
}

/**
 * Send standard JSON response.
 */
function jsonResponse(array $data, int $statusCode = 200) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
