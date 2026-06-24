const API = '';

document.getElementById('regBtn').addEventListener('click', async () => {
  const fname = document.getElementById('fname').value.trim();
  const lname = document.getElementById('lname').value.trim();
  const email = document.getElementById('email').value.trim();
  const roll  = document.getElementById('roll').value.trim();
  const dept  = document.getElementById('dept').value;
  const year  = document.getElementById('year').value;
  const phone = document.getElementById('phone').value.trim();
  const pw    = document.getElementById('password').value;
  const cpw   = document.getElementById('cpassword').value;
  const err   = document.getElementById('error-msg');
  const suc   = document.getElementById('success-msg');
  const btn   = document.getElementById('regBtn');

  err.style.display = suc.style.display = 'none';

  if (!fname || !lname || !email || !roll || !dept || !year || !pw) {
    err.textContent = 'All fields are required.';
    err.style.display = 'block'; return;
  }
  if (pw !== cpw) {
    err.textContent = 'Passwords do not match.';
    err.style.display = 'block'; return;
  }
  if (pw.length < 6) {
    err.textContent = 'Password must be at least 6 characters.';
    err.style.display = 'block'; return;
  }

  btn.textContent = 'Creating Account...'; btn.classList.add('loading');

  try {
    const res  = await fetch(`${API}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `${fname} ${lname}`, email, roll_number: roll, department: dept, year, phone, password: pw })
    });
    const data = await res.json();
    if (data.success) {
      suc.textContent = 'Account created! Redirecting to login...';
      suc.style.display = 'block';
      setTimeout(() => window.location.href = 'login.html', 1500);
    } else {
      err.textContent = data.message || 'Registration failed.';
      err.style.display = 'block';
    }
  } catch {
    err.textContent = 'Server not reachable.';
    err.style.display = 'block';
  } finally {
    btn.textContent = 'Create Account'; btn.classList.remove('loading');
  }
});
