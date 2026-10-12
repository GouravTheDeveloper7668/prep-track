<?php
/**
 * PrepTrack — MySQL Database Connection Configuration
 * Uses PDO for secure prepared statements and UTF-8 encoding.
 */

// Database credentials for XAMPP
define('DB_HOST', '127.0.0.1');
define('DB_PORT', '3306');
define('DB_NAME', 'preptrack');
define('DB_USER', 'root');
define('DB_PASS', '');

/**
 * Returns a PDO database connection instance.
 * Automatically creates the database if it doesn't exist yet.
 * 
 * @return PDO
 */
function getDB(): PDO {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $dsn = sprintf('mysql:host=%s;port=%s;charset=utf8mb4', DB_HOST, DB_PORT);
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        // Connect to MySQL server first
        $serverConn = new PDO($dsn, DB_USER, DB_PASS, $options);
        
        // Ensure database exists
        $serverConn->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        
        // Now connect to the specific database
        $dbDsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
        $pdo = new PDO($dbDsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        // Return JSON error if request is API, or throw
        if (str_contains($_SERVER['REQUEST_URI'] ?? '', '/api/')) {
            header('Content-Type: application/json; charset=utf-8');
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Database connection failed: ' . $e->getMessage(),
                'hint' => 'Make sure MySQL service is running in XAMPP control panel.'
            ]);
            exit;
        }
        throw new Exception("Database connection failed: " . $e->getMessage());
    }
}

/**
 * Helper to check and validate remember token from cookie.
 * 
 * @return array|false
 */
function checkRememberToken() {
    if (!empty($_SESSION['user_id'])) {
        return ['id' => $_SESSION['user_id'], 'username' => $_SESSION['username'] ?? 'User'];
    }

    if (empty($_COOKIE['pt_rem'])) {
        return false;
    }

    $token = $_COOKIE['pt_rem'];
    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT id, username, email, full_name FROM users WHERE remember_token = ? LIMIT 1");
        $stmt->execute([$token]);
        $user = $stmt->fetch();
        if ($user) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['email'] = $user['email'];
            $_SESSION['full_name'] = $user['full_name'];
            return $user;
        }
    } catch (Exception $e) {
        return false;
    }

    return false;
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
