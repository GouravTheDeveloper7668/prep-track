// PrepTrack — Firebase Messaging Service Worker
// Enables Background Chrome Push Notifications

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Initialize Firebase inside the Service Worker
const firebaseConfig = {
    apiKey: "AIzaSyD_UxYGyZZSpm2NovegbRKZm6t1QuFZI28",
    authDomain: "webcode-studio-253ca.firebaseapp.com",
    projectId: "webcode-studio-253ca",
    storageBucket: "webcode-studio-253ca.firebasestorage.app",
    messagingSenderId: "473313945470",
    appId: "1:473313945470:web:cab8ff8a2497feecd7352f"
};

firebase.initializeApp(firebaseConfig);

let messaging = null;
try {
    if (firebase.messaging.isSupported()) {
        messaging = firebase.messaging();
    }
} catch (e) {
    console.warn('[SW] Firebase messaging unsupported in this context:', e);
}

// Background push notification handler via FCM
if (messaging) {
    messaging.onBackgroundMessage(function(payload) {
        console.log('[SW] Received background message:', payload);

        const title = (payload.notification && payload.notification.title) || (payload.data && payload.data.title) || '⏰ PrepTrack Reminder';
        const body = (payload.notification && payload.notification.body) || (payload.data && payload.data.body) || 'You have a scheduled study task due.';
        const url = (payload.data && payload.data.url) || '/prep/index.php';

        const options = {
            body: body,
            icon: 'https://cdn-icons-png.flaticon.com/512/3233/3233483.png',
            badge: 'https://cdn-icons-png.flaticon.com/512/3233/3233483.png',
            tag: 'preptrack-reminder-' + Date.now(),
            renotify: true,
            requireInteraction: true,
            vibrate: [200, 100, 200],
            data: { url: url }
        };

        return self.registration.showNotification(title, options);
    });
}

// Native Web Push Event fallback
self.addEventListener('push', function(event) {
    if (!event.data) return;

    let payload = {};
    try {
        payload = event.data.json();
    } catch (_) {
        payload = { notification: { title: '⏰ PrepTrack Study Alert', body: event.data.text() } };
    }

    const title = (payload.notification && payload.notification.title) || (payload.data && payload.data.title) || '⏰ PrepTrack Reminder';
    const body = (payload.notification && payload.notification.body) || (payload.data && payload.data.body) || 'Study task reminder!';
    const url = (payload.data && payload.data.url) || '/prep/index.php';

    const options = {
        body: body,
        icon: 'https://cdn-icons-png.flaticon.com/512/3233/3233483.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/3233/3233483.png',
        tag: 'preptrack-' + (payload.data && payload.data.task_id || Date.now()),
        renotify: true,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: { url: url }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Click notification event -> Focus or open app
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const targetUrl = (event.notification.data && event.notification.data.url) || '/prep/index.php';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes('/prep/') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
