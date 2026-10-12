<?php
require_once __DIR__ . '/config/db.php';
session_start();

// Server-side authentication check
$user = checkRememberToken();
if (empty($_SESSION['user_id']) && !$user) {
    header('Location: login.php');
    exit;
}

$currentUserId = $_SESSION['user_id'] ?? $user['id'] ?? 1;
$currentUsername = $_SESSION['username'] ?? $user['username'] ?? 'sonu';
$currentUserEmail = $_SESSION['email'] ?? $user['email'] ?? '';
$currentUserFullName = $_SESSION['full_name'] ?? $user['full_name'] ?? 'Sonu Kumar';
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>PrepTrack — My 120-Day Interview Journey</title>
    <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Inter:wght@400;600&display=swap"
        rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="assets/css/style.css">
    <script>
        // Injected authenticated MySQL user context
        window.AUTH_USER = {
            id: <?= json_encode($currentUserId) ?>,
            username: <?= json_encode($currentUsername) ?>,
            email: <?= json_encode($currentUserEmail) ?>,
            fullName: <?= json_encode($currentUserFullName) ?>
        };
    </script>
</head>

<body>
    <div class="app">
        <aside class="side" id="side">
            <div class="side-head">
                <div class="logo-wrap">
                    <span class="logo">PrepTrack</span>
                    <span class="side-badge">120d</span>
                </div>
                <button class="side-close" data-act="closeside" aria-label="Close sidebar" title="Close sidebar">
                    <i class="fa fa-xmark"></i>
                </button>
            </div>
            <nav class="nav" id="nav"></nav>
            <div class="side-footer" id="sideFooter"></div>
        </aside>
        <div class="side-backdrop" id="sideBackdrop" data-act="closeside"></div>
        <main class="main">
            <div id="top" class="top"></div>
            <div id="v"></div>
        </main>
    </div>
    <div id="toasts" aria-live="polite"></div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js"></script>
    <script src="assets/js/firebase-notify.js?v=<?= filemtime(__DIR__ . '/assets/js/firebase-notify.js') ?>"></script>
    <script src="assets/js/storage.js?v=<?= filemtime(__DIR__ . '/assets/js/storage.js') ?>"></script>
    <script src="assets/js/app.js?v=<?= filemtime(__DIR__ . '/assets/js/app.js') ?>"></script>
</body>

</html>