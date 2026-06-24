// login.js

const API = '';

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Toggle password visibility
document.getElementById('togglePw').addEventListener('click', function () {
  const pw = document.getElementById('password');
  pw.type = pw.type === 'password' ? 'text' : 'password';
  this.textContent = pw.type === 'password' ? '👁' : '🙈';
});

// Login handler
document.getElementById('loginBtn').addEventListener('click', async () => {
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const role     = document.querySelector('.tab-btn.active').dataset.role;
  const errEl    = document.getElementById('error-msg');
  const sucEl    = document.getElementById('success-msg');
  const btn      = document.getElementById('loginBtn');

  errEl.style.display = 'none';
  sucEl.style.display = 'none';

  if (!email || !password) {
    errEl.textContent = 'Please fill in all fields.';
    errEl.style.display = 'block';
    return;
  }

  btn.textContent = 'Signing in...';
  btn.classList.add('loading');

  try {
    const res  = await fetch(`${API}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role })
    });
    const data = await res.json();

    if (data.success) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('role',  data.role);
      localStorage.setItem('user',  JSON.stringify(data.user));
      sucEl.textContent = 'Login successful! Redirecting...';
      sucEl.style.display = 'block';
      setTimeout(() => {
        window.location.href = data.role === 'admin' ? 'admin.html' : 'student.html';
      }, 800);
    } else {
      errEl.textContent = data.message || 'Invalid credentials.';
      errEl.style.display = 'block';
    }
  } catch {
    errEl.textContent = 'Server not reachable. Make sure the backend is running.';
    errEl.style.display = 'block';
  } finally {
    btn.textContent = 'Sign In';
    btn.classList.remove('loading');
  }
});

// Allow Enter key
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('loginBtn').click();
});
