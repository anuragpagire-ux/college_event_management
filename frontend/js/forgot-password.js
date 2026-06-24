// forgot-password.js

const API = '';

let userEmail   = '';
let resetToken  = '';
let resendTimer = null;

const errEl = document.getElementById('error-msg');
const sucEl = document.getElementById('success-msg');

function showError(msg) {
  sucEl.style.display = 'none';
  errEl.textContent = msg;
  errEl.style.display = 'block';
}
function showSuccess(msg) {
  errEl.style.display = 'none';
  sucEl.textContent = msg;
  sucEl.style.display = 'block';
}
function clearMsgs() {
  errEl.style.display = 'none';
  sucEl.style.display = 'none';
}

function goToStep(n) {
  clearMsgs();
  document.querySelectorAll('.fp-step').forEach(s => s.style.display = 'none');
  document.getElementById(`step${n}`).style.display = 'block';

  // update step indicator (only 3 dots, step 4 = success keeps step 3 marked done)
  for (let i = 1; i <= 3; i++) {
    const dot  = document.getElementById(`step-dot-${i}`);
    const line = document.getElementById(`step-line-${i}`);
    dot.classList.remove('active', 'done');
    if (i < n || n === 4) dot.classList.add('done');
    else if (i === n) dot.classList.add('active');
    if (line) {
      line.classList.toggle('done', i < n || n === 4);
    }
  }
}

function setLoading(btn, loadingText, defaultText) {
  btn.textContent = loadingText;
  btn.classList.add('loading');
  return () => { btn.textContent = defaultText; btn.classList.remove('loading'); };
}

// ---------------- STEP 1: Send OTP ----------------
async function sendOtp() {
  const emailInput = document.getElementById('fp-email');
  const email = emailInput.value.trim().toLowerCase();
  const btn = document.getElementById('sendOtpBtn');

  if (!email) { showError('Please enter your email address.'); return; }

  const reset = setLoading(btn, 'Sending...', 'Send OTP');
  try {
    const res  = await fetch(`${API}/api/forgot-password/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();

    if (data.success) {
      userEmail = email;
      document.getElementById('otp-email-display').textContent = email;
      clearOtpBoxes();
      goToStep(2);
      showSuccess(data.message || 'OTP sent successfully.');
      startResendCooldown();
      focusFirstOtpBox();
    } else {
      showError(data.message || 'Could not send OTP.');
    }
  } catch {
    showError('Server not reachable. Make sure the backend is running.');
  } finally {
    reset();
  }
}

// ---------------- STEP 2: Verify OTP ----------------
function getOtpValue() {
  return Array.from(document.querySelectorAll('.otp-box')).map(b => b.value).join('');
}
function clearOtpBoxes() {
  document.querySelectorAll('.otp-box').forEach(b => b.value = '');
}
function focusFirstOtpBox() {
  const first = document.querySelector('.otp-box');
  if (first) first.focus();
}

function setupOtpBoxes() {
  const boxes = document.querySelectorAll('.otp-box');
  boxes.forEach((box, idx) => {
    box.addEventListener('input', () => {
      box.value = box.value.replace(/[^0-9]/g, '').slice(0, 1);
      if (box.value && idx < boxes.length - 1) boxes[idx + 1].focus();
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && idx > 0) boxes[idx - 1].focus();
    });
    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
      text.slice(0, boxes.length).split('').forEach((ch, i) => { boxes[i].value = ch; });
      const next = Math.min(text.length, boxes.length - 1);
      boxes[next].focus();
    });
  });
}

async function verifyOtp() {
  const otp = getOtpValue();
  const btn = document.getElementById('verifyOtpBtn');

  if (otp.length !== 6) { showError('Please enter the complete 6-digit OTP.'); return; }

  const reset = setLoading(btn, 'Verifying...', 'Verify OTP');
  try {
    const res  = await fetch(`${API}/api/forgot-password/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, otp })
    });
    const data = await res.json();

    if (data.success) {
      resetToken = data.reset_token;
      goToStep(3);
      showSuccess('OTP verified. Choose your new password.');
    } else {
      showError(data.message || 'Invalid or expired OTP.');
    }
  } catch {
    showError('Server not reachable. Make sure the backend is running.');
  } finally {
    reset();
  }
}

// ---------------- Resend OTP ----------------
function startResendCooldown() {
  let seconds = 60;
  const countEl   = document.getElementById('resendCount');
  const timerWrap = document.getElementById('resendTimer');
  const linkEl    = document.getElementById('resendOtpLink');

  timerWrap.style.display = 'inline';
  linkEl.style.display = 'none';
  countEl.textContent = seconds;

  clearInterval(resendTimer);
  resendTimer = setInterval(() => {
    seconds -= 1;
    countEl.textContent = seconds;
    if (seconds <= 0) {
      clearInterval(resendTimer);
      timerWrap.style.display = 'none';
      linkEl.style.display = 'inline';
    }
  }, 1000);
}

async function resendOtp() {
  const linkEl = document.getElementById('resendOtpLink');
  linkEl.textContent = 'Sending...';
  try {
    const res  = await fetch(`${API}/api/forgot-password/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail })
    });
    const data = await res.json();
    if (data.success) {
      clearOtpBoxes();
      focusFirstOtpBox();
      showSuccess('A new OTP has been sent.');
      startResendCooldown();
    } else {
      showError(data.message || 'Could not resend OTP.');
    }
  } catch {
    showError('Server not reachable. Make sure the backend is running.');
  } finally {
    linkEl.textContent = 'Resend OTP';
  }
}

// ---------------- STEP 3: Reset Password ----------------
async function resetPassword() {
  const pw  = document.getElementById('new-password').value;
  const cpw = document.getElementById('confirm-password').value;
  const btn = document.getElementById('resetPwBtn');

  if (!pw || !cpw) { showError('Please fill in both password fields.'); return; }
  if (pw.length < 6) { showError('Password must be at least 6 characters.'); return; }
  if (pw !== cpw) { showError('Passwords do not match.'); return; }

  const reset = setLoading(btn, 'Resetting...', 'Reset Password');
  try {
    const res  = await fetch(`${API}/api/forgot-password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, reset_token: resetToken, new_password: pw })
    });
    const data = await res.json();

    if (data.success) {
      goToStep(4);
    } else {
      showError(data.message || 'Could not reset password.');
    }
  } catch {
    showError('Server not reachable. Make sure the backend is running.');
  } finally {
    reset();
  }
}

// ---------------- Wiring ----------------
document.getElementById('sendOtpBtn').addEventListener('click', sendOtp);
document.getElementById('verifyOtpBtn').addEventListener('click', verifyOtp);
document.getElementById('resetPwBtn').addEventListener('click', resetPassword);
document.getElementById('resendOtpLink').addEventListener('click', (e) => { e.preventDefault(); resendOtp(); });
document.getElementById('changeEmailLink').addEventListener('click', (e) => {
  e.preventDefault();
  clearInterval(resendTimer);
  goToStep(1);
});
document.getElementById('goToLoginBtn').addEventListener('click', () => {
  window.location.href = 'login.html';
});
document.getElementById('toggleNewPw').addEventListener('click', function () {
  const pw = document.getElementById('new-password');
  pw.type = pw.type === 'password' ? 'text' : 'password';
  this.textContent = pw.type === 'password' ? '👁' : '🙈';
});

setupOtpBoxes();

// Allow Enter key to advance the current step
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (document.getElementById('step1').style.display !== 'none') document.getElementById('sendOtpBtn').click();
  else if (document.getElementById('step2').style.display !== 'none') document.getElementById('verifyOtpBtn').click();
  else if (document.getElementById('step3').style.display !== 'none') document.getElementById('resetPwBtn').click();
});
