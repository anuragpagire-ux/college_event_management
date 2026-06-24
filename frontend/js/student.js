const API = '';
let user = null, token = null, allEvents = [], myRegs = [];

// ---- AUTH CHECK ----
window.addEventListener('DOMContentLoaded', () => {
  token = localStorage.getItem('token');
  user  = JSON.parse(localStorage.getItem('user') || 'null');
  if (!token || !user) return window.location.href = 'login.html';
  populateSidebar();
  populateIDCard();
  generateMyQR();
  loadDashboard();
  loadAllEvents();
  loadMyRegs();
  populateProfile();
});

function populateSidebar() {
  document.getElementById('sidebarAvatar').textContent = user.name[0].toUpperCase();
  document.getElementById('sidebarName').textContent   = user.name;
  document.getElementById('sidebarDept').textContent   = user.department;
  document.getElementById('pageSubtitle').textContent  = `Hello, ${user.name.split(' ')[0]}!`;
}

function populateIDCard() {
  document.getElementById('idAvatar').textContent = user.name[0].toUpperCase();
  document.getElementById('idName').textContent   = user.name;
  document.getElementById('idRoll').textContent   = user.roll_number;
  document.getElementById('idDept').textContent   = user.department;
  document.getElementById('idYear').textContent   = user.year;
  document.getElementById('idEmail').textContent  = user.email;
}

function generateMyQR() {
  document.getElementById('qrCode').innerHTML = '';
  new QRCode(document.getElementById('qrCode'), {
    text: JSON.stringify({ student_id: user.id, name: user.name, roll: user.roll_number }),
    width: 200, height: 200, colorDark: '#0A1628', colorLight: '#FFFFFF',
    correctLevel: QRCode.CorrectLevel.H
  });
}

function downloadQR() {
  const canvas = document.querySelector('#qrCode canvas');
  if (!canvas) return showToast('QR not generated yet', 'error');
  const a = document.createElement('a'); a.href = canvas.toDataURL(); a.download = `NWC_QR_${user.roll_number}.png`; a.click();
}

// ---- LOAD DASHBOARD ----
async function loadDashboard() {
  try {
    const res  = await apiFetch('/api/events');
    const data = await res.json();
    allEvents  = data.events || [];
    document.getElementById('st-total').textContent    = allEvents.length;
    document.getElementById('st-upcoming').textContent = allEvents.filter(e => new Date(e.date) >= new Date()).length;
    renderDashEvents();
  } catch {}
}

function renderDashEvents() {
  const tbody = document.getElementById('dashEventsTbl');
  const upcoming = allEvents.filter(e => new Date(e.date) >= new Date()).slice(0, 5);
  if (!upcoming.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--gray-3);">No upcoming events</td></tr>'; return; }
  tbody.innerHTML = upcoming.map(e => {
    const reg = myRegs.find(r => r.event_id === e.id);
    return `<tr>
      <td><strong>${e.name}</strong></td>
      <td>${formatDate(e.date)}</td>
      <td>${e.venue}</td>
      <td>${reg ? `<span class="badge badge-green">Registered</span>` : `<span class="badge badge-blue">Open</span>`}</td>
      <td>${reg ? `<button class="btn btn-outline btn-sm" onclick="showEventQR(${e.id},'${e.name}')">View QR</button>` : `<button class="btn btn-primary btn-sm" onclick="registerEvent(${e.id})">Register</button>`}</td>
    </tr>`;
  }).join('');
}

// ---- LOAD ALL EVENTS ----
async function loadAllEvents() {
  try {
    const res  = await apiFetch('/api/events');
    const data = await res.json();
    allEvents  = data.events || [];
    renderAllEvents(allEvents);
  } catch {}
}

function renderAllEvents(events) {
  const tbody = document.getElementById('allEventsTbl');
  if (!events.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--gray-3);">No events found</td></tr>'; return; }
  tbody.innerHTML = events.map(e => {
    const reg = myRegs.find(r => r.event_id === e.id);
    const full = e.seats_available <= 0;
    return `<tr>
      <td><strong>${e.name}</strong><br/><small style="color:var(--gray-3);">${e.description?.substring(0,60)||''}</small></td>
      <td>${formatDate(e.date)}</td>
      <td>${e.venue}</td>
      <td><span class="badge badge-blue">${e.category||'General'}</span></td>
      <td>${full ? '<span class="badge badge-red">Full</span>' : e.seats_available}</td>
      <td>${reg ? `<span class="badge badge-green">✓ Registered</span>` : full ? `<span class="badge badge-gray">Full</span>` : `<button class="btn btn-primary btn-sm" onclick="registerEvent(${e.id})">Register</button>`}</td>
    </tr>`;
  }).join('');
}

function filterEvents() {
  const q = document.getElementById('eventSearch').value.toLowerCase();
  renderAllEvents(allEvents.filter(e => e.name.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q) || (e.category||'').toLowerCase().includes(q)));
}

// ---- MY REGISTRATIONS ----
async function loadMyRegs() {
  try {
    const res  = await apiFetch('/api/student/registrations');
    const data = await res.json();
    myRegs     = data.registrations || [];
    document.getElementById('st-reg').textContent      = myRegs.length;
    document.getElementById('st-attended').textContent = myRegs.filter(r => r.attended).length;
    renderMyRegs();
    renderDashEvents();
    renderAllEvents(allEvents);
  } catch {}
}

function renderMyRegs() {
  const tbody = document.getElementById('myRegTbl');
  if (!myRegs.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--gray-3);">No registrations yet</td></tr>'; return; }
  tbody.innerHTML = myRegs.map(r => `<tr>
    <td><strong>${r.event_name}</strong></td>
    <td>${formatDate(r.registered_at)}</td>
    <td>${formatDate(r.event_date)}</td>
    <td>${r.attended ? `<span class="badge badge-green">✓ Attended</span>` : `<span class="badge badge-gold">Pending</span>`}</td>
    <td><button class="btn btn-outline btn-sm" onclick="showEventQR(${r.event_id},'${r.event_name}')">QR</button></td>
  </tr>`).join('');
}

// ---- REGISTER FOR EVENT ----
async function registerEvent(eventId) {
  try {
    const res  = await apiFetch('/api/register-event', 'POST', { event_id: eventId });
    const data = await res.json();
    if (data.success) { showToast('Registered successfully!', 'success'); await loadMyRegs(); await loadAllEvents(); }
    else showToast(data.message || 'Failed to register', 'error');
  } catch { showToast('Server error', 'error'); }
}

// ---- EVENT QR ----
function showEventQR(eventId, eventName) {
  document.getElementById('eventQRCode').innerHTML = '';
  document.getElementById('eventQRLabel').textContent = eventName;
  new QRCode(document.getElementById('eventQRCode'), {
    text: JSON.stringify({ student_id: user.id, event_id: eventId, roll: user.roll_number }),
    width: 200, height: 200, colorDark: '#0A1628', colorLight: '#FFFFFF',
    correctLevel: QRCode.CorrectLevel.H
  });
  document.getElementById('eventQRModal').classList.add('open');
}
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ---- PROFILE ----
function populateProfile() {
  document.getElementById('pName').value  = user.name;
  document.getElementById('pEmail').value = user.email;
  document.getElementById('pRoll').value  = user.roll_number;
  document.getElementById('pPhone').value = user.phone || '';
  document.getElementById('pDept').value  = user.department;
  document.getElementById('pYear').value  = user.year;
}

async function updateProfile() {
  const name  = document.getElementById('pName').value;
  const phone = document.getElementById('pPhone').value;
  try {
    const res  = await apiFetch('/api/student/profile', 'PUT', { name, phone });
    const data = await res.json();
    if (data.success) {
      user.name = name; user.phone = phone;
      localStorage.setItem('user', JSON.stringify(user));
      populateSidebar(); populateIDCard();
      showToast('Profile updated!', 'success');
    } else showToast(data.message || 'Update failed', 'error');
  } catch { showToast('Server error', 'error'); }
}

// ---- NAV ----
function showSection(name, el) {
  document.querySelectorAll('section[id^="sec-"]').forEach(s => s.style.display = 'none');
  document.getElementById(`sec-${name}`).style.display = 'block';
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  document.getElementById('pageTitle').textContent = {
    dashboard: 'Dashboard', events: 'Browse Events',
    myevents: 'My Registrations', qrid: 'My QR / ID Card', profile: 'Profile'
  }[name] || name;
}

// ---- UTILS ----
function logout() { localStorage.clear(); window.location.href = 'login.html'; }
function apiFetch(path, method = 'GET', body = null) {
  return fetch(API + path, {
    method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined
  });
}
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3000);
}
