<?php
/**
 * PrepTrack — Firebase Cloud Messaging (FCM) & Notification Configuration
 */

require_once __DIR__ . '/db.php';

function getFirebaseConfig(): array {
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $jsonPath = __DIR__ . '/../firebase.json';
    if (file_exists($jsonPath)) {
        $content = file_get_contents($jsonPath);
        $config = json_decode($content, true) ?: [];
    } else {
        $config = [];
    }

    // Optional: Firebase Cloud Messaging Server Key (Legacy FCM or modern key)
    // Defaults to apiKey from firebase.json
    $config['serverKey'] = $config['apiKey'] ?? '';
    // Secret token for protecting cron URL when accessed over HTTP
    $config['cronSecret'] = 'preptrack_cron_2026';

    return $config;
}

/**
 * Sends a push notification to FCM device tokens using Firebase HTTP API.
 * 
 * @param array $tokens List of FCM device registration tokens
 * @param string $title Notification title
 * @param string $body Notification message body
 * @param array $data Extra custom data payload
 * @return array Result of sending
 */
function sendFcmNotification(array $tokens, string $title, string $body, array $data = []): array {
    if (empty($tokens)) {
        return ['success' => false, 'message' => 'No FCM tokens provided'];
    }

    $config = getFirebaseConfig();
    $serverKey = $config['serverKey'] ?? '';

    // Standard FCM payload for Web Chrome
    $payload = [
        'registration_ids' => array_values(array_unique($tokens)),
        'notification' => [
            'title' => $title,
            'body'  => $body,
            'icon'  => '/prep/assets/icons/icon-192.png',
            'badge' => '/prep/assets/icons/icon-192.png',
            'click_action' => '/prep/index.php',
            'sound' => 'default'
        ],
        'data' => array_merge([
            'title'     => $title,
            'body'      => $body,
            'url'       => '/prep/index.php',
            'timestamp' => time()
        ], $data),
        'priority' => 'high'
    ];

    $headers = [
        'Authorization: key=' . $serverKey,
        'Content-Type: application/json'
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://fcm.googleapis.com/fcm/send');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);

    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        return [
            'success' => false,
            'error'   => $error,
            'httpCode'=> $httpCode
        ];
    }

    $decoded = json_decode($result, true) ?: [];
    return [
        'success'  => ($httpCode === 200),
        'httpCode' => $httpCode,
        'response' => $decoded,
        'raw'      => $result
    ];
}
