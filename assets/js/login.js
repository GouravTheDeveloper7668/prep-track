/**
 * PrepTrack — Dynamic MySQL Login & Registration Logic
 */

// 1. Initial Auth Check with Server
(async function verifyExistingAuth() {
  try {
    const res = await fetch('api/auth.php?action=check');
    if (res.ok) {
      const data = await res.json();
      if (data.authenticated) {
        location.replace('index.php');
      }
    }
  } catch (_) {
    // If offline or first load, check localStorage/sessionStorage as fallback
    if (sessionStorage.getItem('pt_s') || localStorage.getItem('pt_s')) {
      location.replace('index.php');
    }
  }
})();

const form = document.getElementById('f');
const errBox = document.getElementById('err');
const eyeBtn = document.getElementById('eye');
const pwInput = document.getElementById('p');
const userInput = document.getElementById('u');
const emailInput = document.getElementById('email');
const fullNameInput = document.getElementById('fullName');
const btnQuickFill = document.getElementById('btnQuickFill');
const submitBtn = document.getElementById('submitBtn');
const submitIcon = document.getElementById('submitIcon');
const submitText = document.getElementById('submitText');
const authAction = document.getElementById('authAction');

let currentMode = 'login';

// Toggle password show/hide
if (eyeBtn) {
  eyeBtn.onclick = () => {
    const isPw = pwInput.type === 'password';
    pwInput.type = isPw ? 'text' : 'password';
    eyeBtn.innerHTML = isPw ? '<i class="fa fa-eye-slash"></i>' : '<i class="fa fa-eye"></i>';
  };
}

// Quick fill demo credentials
if (btnQuickFill) {
  btnQuickFill.onclick = () => {
    switchAuthMode('login');
    userInput.value = 'sonu';
    pwInput.value = 'Prep@2026';
    errBox.style.display = 'none';
  };
}

// Switch between Login and Register
window.switchAuthMode = function(mode) {
  currentMode = mode;
  authAction.value = mode;
  errBox.style.display = 'none';

  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const fullNameGroup = document.getElementById('fullNameGroup');
  const emailGroup = document.getElementById('emailGroup');
  const remGroup = document.getElementById('remGroup');
  const userLabel = document.getElementById('userLabel');
  const demoBanner = document.getElementById('demoBanner');

  if (mode === 'register') {
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
    fullNameGroup.style.display = 'block';
    emailGroup.style.display = 'block';
    remGroup.style.display = 'none';
    demoBanner.style.display = 'none';
    userLabel.textContent = 'Choose Username';
    userInput.placeholder = 'e.g. dev_sonu';
    submitIcon.className = 'fa fa-user-plus';
    submitText.textContent = 'Create MySQL Account';
  } else {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    fullNameGroup.style.display = 'none';
    emailGroup.style.display = 'none';
    remGroup.style.display = 'block';
    demoBanner.style.display = 'flex';
    userLabel.textContent = 'Username or Email';
    userInput.placeholder = 'sonu or user@example.com';
    submitIcon.className = 'fa fa-right-to-bracket';
    submitText.textContent = 'Sign In with MySQL';
  }
};

// Handle submission to dynamic MySQL API
if (form) {
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    errBox.style.display = 'none';

    const u = userInput.value.trim();
    const p = pwInput.value;
    const remember = document.getElementById('rememberMe')?.checked ?? false;

    if (!u || !p) {
      showError('Please enter both username and password.');
      return;
    }

    // Set loading state
    setLoading(true);

    try {
      let payload = {};
      let endpoint = '';

      if (currentMode === 'register') {
        const email = emailInput.value.trim();
        const fullName = fullNameInput.value.trim() || 'Candidate';

        if (!email) {
          showError('Please enter a valid email address.');
          setLoading(false);
          return;
        }

        endpoint = 'api/auth.php?action=register';
        payload = { username: u, email, password: p, full_name: fullName };
      } else {
        endpoint = 'api/auth.php?action=login';
        payload = { username: u, password: p, remember };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showError(data.message || 'Authentication failed. Please verify your credentials.');
        setLoading(false);
        return;
      }

      // Store local session info for frontend application
      const sessionData = {
        u: data.user.username,
        user: data.user,
        t: Date.now()
      };

      (remember ? localStorage : sessionStorage).setItem('pt_s', JSON.stringify(sessionData));

      // Show success feedback
      submitBtn.style.background = 'var(--ok)';
      submitIcon.className = 'fa fa-check';
      submitText.textContent = 'Authenticated! Redirecting...';

      setTimeout(() => {
        location.replace(data.redirect || 'index.php');
      }, 400);

    } catch (err) {
      showError('Network error: Could not reach the MySQL authentication server. ' + err.message);
      setLoading(false);
    }
  };
}

function showError(msg) {
  errBox.textContent = msg;
  errBox.style.display = 'block';
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  if (isLoading) {
    submitIcon.className = 'fa fa-spinner fa-spin';
    submitText.textContent = currentMode === 'register' ? 'Creating Account...' : 'Verifying with MySQL...';
  } else {
    if (currentMode === 'register') {
      submitIcon.className = 'fa fa-user-plus';
      submitText.textContent = 'Create MySQL Account';
    } else {
      submitIcon.className = 'fa fa-right-to-bracket';
      submitText.textContent = 'Sign In with MySQL';
    }
  }
}
