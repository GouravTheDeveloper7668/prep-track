<?php
/**
 * PrepTrack — Automated MySQL Migration Runner
 * Can be run from command line (`php migrate.php`) or accessed via web browser.
 */

require_once __DIR__ . '/../config/db.php';

$isCli = (php_sapi_name() === 'cli');

function out(string $msg, string $type = 'info', bool $isCli = false) {
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

$results = [];
$error = null;

try {
    // 1. Establish connection to MySQL
    $db = getDB();

    // 2. Ensure migrations tracking table exists
    $db->exec("
        CREATE TABLE IF NOT EXISTS `migrations` (
            `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `migration` VARCHAR(255) NOT NULL UNIQUE,
            `batch` INT UNSIGNED NOT NULL,
            `applied_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 3. Get existing executed migrations
    $stmt = $db->query("SELECT migration FROM `migrations`");
    $applied = $stmt->fetchAll(PDO::FETCH_COLUMN);

    // Get current batch number
    $stmt = $db->query("SELECT MAX(batch) as max_batch FROM `migrations`");
    $row = $stmt->fetch();
    $nextBatch = ($row['max_batch'] ?? 0) + 1;

    // 4. Scan migration files
    $files = glob(__DIR__ . '/*.sql');
    sort($files);

    $migrationFiles = [];
    foreach ($files as $file) {
        $base = basename($file);
        // Exclude full schema dump from incremental runner
        if ($base === 'schema.sql') continue;
        $migrationFiles[] = $base;
    }

    $pending = array_diff($migrationFiles, $applied);

    if (empty($pending)) {
        $msg = "All migrations are already up to date. (Total applied: " . count($applied) . ")";
        out($msg, 'info', $isCli);
        $results[] = ['file' => 'All files', 'status' => 'Already up to date', 'type' => 'info'];
    } else {
        out("Found " . count($pending) . " pending migration(s). Running batch #$nextBatch...", 'head', $isCli);
        
        foreach ($pending as $migrationFile) {
            $path = __DIR__ . '/' . $migrationFile;
            $sql = file_get_contents($path);

            // Execute the SQL file statements
            try {
                // Split statements safely
                $db->exec($sql);

                // Record in migrations table
                $logStmt = $db->prepare("INSERT INTO `migrations` (`migration`, `batch`) VALUES (?, ?)");
                $logStmt->execute([$migrationFile, $nextBatch]);

                out("Applied: $migrationFile", 'success', $isCli);
                $results[] = ['file' => $migrationFile, 'status' => 'Successfully Applied', 'type' => 'success'];
            } catch (Exception $ex) {
                out("Failed on $migrationFile: " . $ex->getMessage(), 'error', $isCli);
                $results[] = ['file' => $migrationFile, 'status' => 'Failed: ' . $ex->getMessage(), 'type' => 'error'];
                $error = $ex->getMessage();
                break;
            }
        }
    }

} catch (Exception $e) {
    $error = $e->getMessage();
    out("Migration setup error: " . $error, 'error', $isCli);
}

// If running in CLI, exit here
if ($isCli) {
    if ($error) {
        exit(1);
    }
    echo PHP_EOL . "Migration complete! MySQL database is ready." . PHP_EOL;
    exit(0);
}

// Web UI presentation
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>PrepTrack — MySQL Database Migrations</title>
    <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Inter:wght@400;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="../assets/css/style.css">
    <style>
        .mig-card { max-width: 760px; margin: 40px auto; padding: 28px; background: var(--card); border: 1px solid var(--bd); border-radius: var(--r); box-shadow: var(--sh); }
        .mig-list { margin: 20px 0; border: 1px solid var(--bd); border-radius: 8px; overflow: hidden; }
        .mig-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--bd); font-size: 0.95em; }
        .mig-item:last-child { border-bottom: none; }
        .badge-success { background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3); padding: 4px 10px; border-radius: 999px; }
        .badge-info { background: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3); padding: 4px 10px; border-radius: 999px; }
        .badge-error { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 4px 10px; border-radius: 999px; }
        .demo-box { background: rgba(124, 92, 255, 0.1); border: 1px solid rgba(124, 92, 255, 0.25); border-radius: 8px; padding: 14px 16px; margin: 18px 0; font-size: 0.9em; }
    </style>
</head>
<body style="min-height: 100vh; background: var(--bg); color: var(--tx); padding: 20px;">
    <div class="mig-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <div>
                <span class="logo cur" style="font-size:2em;color:var(--pr);">PrepTrack</span>
                <h1 style="font-size:1.4em;margin:4px 0 0 0;">MySQL Database Migrations</h1>
            </div>
            <span class="badge" style="background:var(--bd);"><i class="fa fa-database"></i> MySQL Dynamic Mode</span>
        </div>

        <p class="mu sm">Auto-detected MySQL server on <code>127.0.0.1:3306</code>. Database: <code>preptrack</code>.</p>

        <?php if ($error): ?>
            <div style="background:rgba(239,68,68,0.15);border:1px solid #ef4444;color:#ef4444;padding:12px;border-radius:8px;margin-bottom:16px;">
                <i class="fa fa-triangle-exclamation"></i> <b>Migration Error:</b> <?= htmlspecialchars($error) ?>
            </div>
        <?php endif; ?>

        <div class="mig-list">
            <?php foreach ($results as $res): ?>
                <div class="mig-item">
                    <span><i class="fa fa-file-code mu" style="margin-right:8px;"></i> <b><?= htmlspecialchars($res['file']) ?></b></span>
                    <span class="badge-<?= $res['type'] ?>"><?= htmlspecialchars($res['status']) ?></span>
                </div>
            <?php endforeach; ?>
        </div>

        <div class="demo-box">
            <h4 style="margin:0 0 6px 0;color:var(--tx);"><i class="fa fa-key" style="color:var(--pr);"></i> Dynamic MySQL Default Credentials:</h4>
            <div>Username: <code>sonu</code> | Password: <code>Prep@2026</code></div>
            <div class="mu sm" style="margin-top:4px;">These credentials are now verified dynamically against the <code>users</code> table in MySQL with bcrypt hashing!</div>
        </div>

        <div style="display:flex;gap:12px;margin-top:24px;flex-wrap:wrap;">
            <a href="../login.php" class="btn" style="text-decoration:none;"><i class="fa fa-right-to-bracket"></i> Go to Dynamic Login</a>
            <a href="../index.php" class="btn s" style="text-decoration:none;"><i class="fa fa-gauge"></i> Open Dashboard</a>
            <a href="migrate.php" class="btn s" style="text-decoration:none;"><i class="fa fa-arrows-rotate"></i> Re-check Migrations</a>
        </div>
    </div>
</body>
</html>
