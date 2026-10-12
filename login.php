<?php
require_once __DIR__ . '/config/db.php';
session_start();

// If already logged in, redirect to index.php
if (!empty($_SESSION['user_id']) || checkRememberToken()) {
    header('Location: index.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>PrepTrack — Dynamic MySQL Login</title>
    <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Inter:wght@400;500;600;700&display=swap"
        rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="assets/css/style.css">
    <style>
        .login-wrap {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: radial-gradient(circle at 50% 20%, rgba(124, 92, 255, 0.12) 0%, rgba(11, 16, 32, 1) 75%);
        }
        .login-box {
            width: 100%;
            max-width: 440px;
            background: var(--card);
            border: 1px solid var(--bd);
            border-radius: var(--r);
            padding: 32px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.45);
        }
        .auth-tab {
            display: flex;
            background: var(--bg);
            border: 1px solid var(--bd);
            border-radius: 10px;
            padding: 4px;
            margin-bottom: 20px;
        }
        .auth-tab button {
            flex: 1;
            padding: 8px 12px;
            border: none;
            background: transparent;
            color: var(--mu);
            font-weight: 600;
            font-size: 0.9em;
            cursor: pointer;
            border-radius: 8px;
            transition: all 0.2s;
        }
        .auth-tab button.active {
            background: var(--pr);
            color: #fff;
            box-shadow: 0 2px 8px rgba(124, 92, 255, 0.4);
        }
        .cred-card {
            background: rgba(124, 92, 255, 0.08);
            border: 1px dashed rgba(124, 92, 255, 0.35);
            border-radius: 10px;
            padding: 12px 14px;
            margin-bottom: 18px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 0.85em;
        }
        .quick-fill-btn {
            background: var(--pr);
            color: #fff;
            border: none;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 0.82em;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s;
        }
        .quick-fill-btn:hover {
            opacity: 0.88;
        }
        .mysql-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(59, 130, 246, 0.12);
            color: #60a5fa;
            border: 1px solid rgba(59, 130, 246, 0.3);
            padding: 3px 10px;
            border-radius: 999px;
            font-size: 0.78em;
            font-weight: 600;
            margin-bottom: 10px;
        }
        .input-group {
            margin-bottom: 14px;
        }
        .input-group label {
            display: block;
            margin-bottom: 6px;
            font-size: 0.88em;
            font-weight: 500;
            color: var(--tx);
        }
        .input-group input {
            width: 100%;
            padding: 10px 14px;
            background: var(--bg);
            border: 1px solid var(--bd);
            color: var(--tx);
            border-radius: 8px;
            font-size: 0.95em;
            outline: none;
            transition: border-color 0.2s;
        }
        .input-group input:focus {
            border-color: var(--pr);
        }
        .pw-wrapper {
            position: relative;
            display: flex;
            align-items: center;
        }
        .pw-toggle {
            position: absolute;
            right: 10px;
            background: transparent;
            border: none;
            color: var(--mu);
            cursor: pointer;
            padding: 6px;
        }
        .pw-toggle:hover {
            color: var(--tx);
        }
        .notif-card {
            background: rgba(59, 130, 246, 0.08);
            border: 1px solid rgba(59, 130, 246, 0.25);
            border-radius: 10px;
            padding: 12px 14px;
            margin-bottom: 18px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .notif-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .notif-badge {
            font-size: 0.78em;
            padding: 2px 8px;
            border-radius: 999px;
            border: 1px solid rgba(245, 158, 11, 0.3);
            color: var(--wr);
            font-weight: 600;
        }
    </style>
</head>

<body class="login-wrap">
    <div class="login-box">
        <div style="text-align: center; margin-bottom: 20px;">
            <div class="mysql-badge"><i class="fa fa-database"></i> Dynamic MySQL Auth</div>
            <div class="logo cur" style="font-size: 2.6em; line-height: 1; color: var(--pr);">PrepTrack</div>
            <p class="cur" style="margin: 4px 0 10px; font-size: 1.3em; color: var(--tx);">My 120-Day Interview Journey</p>
            <p class="mu sm" style="line-height: 1.45; margin: 0 auto; max-width: 360px;">
                Consistency beats intensity. Your Noida & Gurgaon Laravel Developer offer is built one focused day at a time.
            </p>
        </div>

        <div class="auth-tab">
            <button type="button" class="active" id="tabLogin" onclick="switchAuthMode('login')"><i class="fa fa-right-to-bracket"></i> Login</button>
            <button type="button" id="tabRegister" onclick="switchAuthMode('register')"><i class="fa fa-user-plus"></i> Register</button>
        </div>

        <!-- Quick Credentials Banner -->
        <!-- <div class="cred-card" id="demoBanner">
            <div>
                <b style="color:var(--tx);"><i class="fa fa-key" style="color:var(--pr)"></i> MySQL Demo User:</b><br>
                <span class="mu">User: <code style="color:var(--pr)">sonu</code> | Pass: <code style="color:var(--pr)">Prep@2026</code></span>
            </div>
            <button type="button" class="quick-fill-btn" id="btnQuickFill" title="Auto-fill demo user credentials">Fill</button>
        </div> -->

        <!-- Chrome & Firebase Notification Permission Card -->
        <div class="notif-card" id="notifBanner">
            <div class="notif-card-header">
                <div style="display:flex;align-items:center;gap:8px;">
                    <i class="fa fa-bell" style="color:#60a5fa;"></i>
                    <b style="font-size:0.88em;color:var(--tx);">Chrome Task Reminders</b>
                </div>
                <span id="notifStatusBadge" class="notif-badge"><i class="fa fa-bell"></i> Click to Allow</span>
            </div>
            <p class="mu sm" style="margin:0;font-size:0.82em;line-height:1.35;">
                Allow notifications to receive real-time Chrome desktop alerts before your study tasks (e.g. 9:50 AM reminder for 10:00 AM task).
            </p>
            <div style="display:flex;gap:8px;margin-top:4px;">
                <button type="button" id="btnEnableNotif" onclick="requestNotificationPermission()" class="btn s sm" style="flex:1;justify-content:center;padding:6px 10px;font-size:0.82em;">
                    <i class="fa fa-bell"></i> Enable Chrome Alerts
                </button>
                <button type="button" onclick="testNotificationClick()" class="btn s sm" style="padding:6px 10px;font-size:0.82em;" title="Test desktop notification">
                    <i class="fa fa-play"></i> Test
                </button>
            </div>
        </div>

        <form id="f" novalidate autocomplete="on">
            <input type="hidden" name="action" id="authAction" value="login">

            <div class="input-group" id="fullNameGroup" style="display:none;">
                <label for="fullName">Full Name</label>
                <input id="fullName" name="full_name" type="text" placeholder="e.g. Sonu Kumar" autocomplete="name">
            </div>

            <div class="input-group" id="emailGroup" style="display:none;">
                <label for="email">Email Address</label>
                <input id="email" name="email" type="email" placeholder="e.g. sonu@preptrack.local" autocomplete="email">
            </div>

            <div class="input-group">
                <label for="u" id="userLabel">Username or Email</label>
                <input id="u" name="u" type="text" placeholder="sonu or user@example.com" required autocomplete="username">
            </div>

            <div class="input-group">
                <label for="p">Password</label>
                <div class="pw-wrapper">
                    <input id="p" name="p" type="password" placeholder="••••••••" required autocomplete="current-password">
                    <button type="button" id="eye" class="pw-toggle" aria-label="Show or hide password" title="Toggle password visibility">
                        <i class="fa fa-eye"></i>
                    </button>
                </div>
            </div>

            <div id="remGroup" style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px; font-size: 0.85em; color: var(--mu);">
                <i class="fa fa-shield-halved" style="color: var(--ok);"></i>
                <span><b>Persistent Session:</b> Stays logged in for 30 days unless you logout.</span>
                <input type="hidden" name="r" id="rememberMe" value="1">
            </div>

            <div id="err" class="err-t" role="alert" style="display:none;margin-bottom:14px;padding:10px 14px;border-radius:8px;background:rgba(239,68,68,0.15);border:1px solid #ef4444;color:#ef4444;font-size:0.88em;"></div>

            <button type="submit" id="submitBtn" class="btn" style="width:100%;padding:12px;font-size:1em;">
                <i class="fa fa-right-to-bracket" id="submitIcon"></i> <span id="submitText">Sign In with MySQL</span>
            </button>
        </form>

        <div style="margin-top: 20px; text-align: center; border-top: 1px solid var(--bd); padding-top: 14px;">
            <a href="migrations/migrate.php" class="mu sm" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                <i class="fa fa-database"></i> Database Migration Runner
            </a>
        </div>
    </div>

    <!-- Firebase SDK Scripts -->
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js"></script>
    <script src="assets/js/firebase-notify.js?v=<?= filemtime(__DIR__ . '/assets/js/firebase-notify.js') ?>"></script>
    <script>
        function testNotificationClick() {
            if ('Notification' in window && Notification.permission === 'granted') {
                showDesktopNotification('🔔 PrepTrack Test Alert', 'Real-time Chrome notification working! Scheduled tasks will alert you once.');
            } else {
                requestNotificationPermission();
            }
        }
    </script>

    <script src="assets/js/storage.js?v=<?= filemtime(__DIR__ . '/assets/js/storage.js') ?>"></script>
    <script src="assets/js/login.js?v=<?= filemtime(__DIR__ . '/assets/js/login.js') ?>"></script>
</body>

</html>