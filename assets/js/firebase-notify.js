/**
 * PrepTrack — Real-time Firebase & Chrome Notification Manager
 * Handles permission requests, FCM token registration, and Chrome desktop alerts.
 */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD_UxYGyZZSpm2NovegbRKZm6t1QuFZI28",
  authDomain: "webcode-studio-253ca.firebaseapp.com",
  projectId: "webcode-studio-253ca",
  storageBucket: "webcode-studio-253ca.firebasestorage.app",
  messagingSenderId: "473313945470",
  appId: "1:473313945470:web:cab8ff8a2497feecd7352f"
};

let fcmMessaging = null;
let swRegistration = null;

// Initialize Firebase if loaded
if (typeof firebase !== 'undefined') {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    if (firebase.messaging.isSupported()) {
      fcmMessaging = firebase.messaging();
    }
  } catch (err) {
    console.warn('[FCM] Firebase initialization notice:', err);
  }
}

// Register Service Worker for Chrome background push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('firebase-messaging-sw.js')
      .then((reg) => {
        swRegistration = reg;
        console.log('[FCM] Service Worker registered with scope:', reg.scope);

        if (fcmMessaging && swRegistration) {
          fcmMessaging.useServiceWorker(swRegistration);
        }

        // If permission is already granted, refresh and register token
        if (Notification.permission === 'granted') {
          syncFcmToken();
        }
      })
      .catch((err) => {
        console.warn('[FCM] Service Worker registration notice:', err);
      });
  });
}

// Listen for foreground Firebase messages
if (fcmMessaging) {
  fcmMessaging.onMessage((payload) => {
    console.log('[FCM] Foreground message received:', payload);
    const title = (payload.notification && payload.notification.title) || '⏰ PrepTrack Reminder';
    const body = (payload.notification && payload.notification.body) || 'Study session due now!';
    showDesktopNotification(title, body);
  });
}

/**
 * Request Chrome / Browser Notification Permission
 */
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    if (window.toast) toast('This browser does not support Chrome desktop notifications', 'err');
    return false;
  }

  try {
    const perm = await Notification.requestPermission();
    updateNotificationUI(perm);

    if (perm === 'granted') {
      if (window.toast) toast('Notifications allowed! Generating device push token...', 'ok');
      await syncFcmToken();
      // Show confirmation test notification
      showDesktopNotification(
        '🔔 PrepTrack Alerts Enabled!',
        'You will receive Chrome notifications before each study session. (No duplicates guaranteed).'
      );
      return true;
    } else if (perm === 'denied') {
      if (window.toast) toast('Notifications were blocked. Please enable them in Chrome site settings.', 'warn');
      return false;
    }
  } catch (err) {
    console.error('Permission request error:', err);
    return false;
  }
}

/**
 * Fetch FCM token from Firebase and save to MySQL database
 */
async function syncFcmToken() {
  if (!fcmMessaging) return;

  try {
    // Generate or fetch FCM token
    const token = await fcmMessaging.getToken();
    if (token) {
      console.log('[FCM] Retrieved device token:', token.substring(0, 15) + '...');

      // Save token to MySQL backend
      const res = await fetch('api/notifications.php?action=save_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token })
      });

      if (res.ok) {
        localStorage.setItem('pt_fcm_token', token);
      }
    }
  } catch (err) {
    console.warn('[FCM] Token generation notice (fallback to standard Web Notification):', err.message);
  }
}

/**
 * Show a Chrome desktop system notification
 */
function showDesktopNotification(title, body, url = 'index.php') {
  if (Notification.permission !== 'granted') return;

  const options = {
    body: body,
    icon: 'https://cdn-icons-png.flaticon.com/512/3233/3233483.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/3233/3233483.png',
    requireInteraction: true,
    vibrate: [200, 100, 200]
  };

  // If Service Worker is active, use showNotification for maximum compatibility
  if (swRegistration && swRegistration.showNotification) {
    swRegistration.showNotification(title, options);
  } else {
    // Fallback to standard Notification API
    try {
      const n = new Notification(title, options);
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch (_) {}
  }

  // Play audio sound if sound setting is enabled or audio context available
  playReminderSound();
}

/**
 * Play subtle alert chime
 */
function playReminderSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (_) {}
}

/**
 * Periodic real-time checker for due reminders
 * Checks MySQL backend every 45 seconds so Chrome alerts pop up at the exact reminder time!
 */
setInterval(async function checkDueReminders() {
  if (Notification.permission !== 'granted') return;

  try {
    const res = await fetch('api/notifications.php?action=check_due');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.tasks && data.tasks.length > 0) {
        data.tasks.forEach(t => {
          showDesktopNotification(t.title, t.body);
          if (window.toast) toast(t.title, 'warn');
        });
      }
    }
  } catch (_) {}
}, 45000);

/**
 * Update UI notification badge
 */
function updateNotificationUI(perm) {
  const badge = document.getElementById('notifStatusBadge');
  const btn = document.getElementById('btnEnableNotif');
  const status = perm || (('Notification' in window) ? Notification.permission : 'unsupported');

  if (badge) {
    if (status === 'granted') {
      badge.innerHTML = '<i class="fa fa-circle-check" style="color:var(--ok)"></i> Allowed';
      badge.style.color = 'var(--ok)';
      badge.style.borderColor = 'rgba(34, 197, 94, 0.3)';
    } else if (status === 'denied') {
      badge.innerHTML = '<i class="fa fa-circle-xmark" style="color:var(--er)"></i> Blocked';
      badge.style.color = 'var(--er)';
      badge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
    } else {
      badge.innerHTML = '<i class="fa fa-bell"></i> Click to Allow';
      badge.style.color = 'var(--wr)';
      badge.style.borderColor = 'rgba(245, 158, 11, 0.3)';
    }
  }

  if (btn) {
    if (status === 'granted') {
      btn.innerHTML = '<i class="fa fa-check"></i> Notifications Allowed';
      btn.disabled = true;
      btn.style.opacity = '0.75';
    } else {
      btn.innerHTML = '<i class="fa fa-bell"></i> Allow Notifications';
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  }
}

// Initial UI check on page load
document.addEventListener('DOMContentLoaded', () => {
  if ('Notification' in window) {
    updateNotificationUI(Notification.permission);
  }
});
