const API = '';
let token = null, allEvents = [], allStudents = [], attList = [];

window.addEventListener('DOMContentLoaded', () => {
  token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!token || role !== 'admin') return window.location.href = 'login.html';
  if (user) document.getElementById('adminName').textContent = user.name || 'Admin';
  document.getElementById('pageDate').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  loadDashboard();
  loadEvents();
  loadStudents();
});

// ---- DASHBOARD ----
async function loadDashboard() {
  try {
    const res  = await apiFetch('/api/admin/stats');
    const data = await res.json();
    document.getElementById('a-events').textContent   = data.events   || 0;
    document.getElementById('a-students').textContent = data.students || 0;
    document.getElementById('a-regs').textContent     = data.registrations || 0;
    document.getElementById('a-att').textContent      = data.attendances || 0;
  } catch {}
  loadRecentEvents();
}

async function loadRecentEvents() {
  try {
    const res  = await apiFetch('/api/events');
    const data = await res.json();
    allEvents  = data.events || [];
    const tbody = document.getElementById('adminDashTbl');
    const recent = [...allEvents].sort((a,b) => new Date(b.created_at)-new Date(a.created_at)).slice(0,6);
    tbody.innerHTML = recent.map(e => `<tr>
      <td><strong>${e.name}</strong></td>
      <td>${formatDate(e.date)}</td>
      <td>${e.venue}</td>
      <td>${e.registrations_count || 0} / ${e.total_seats}</td>
      <td>${new Date(e.date) >= new Date() ? `<span class="badge badge-green">Upcoming</span>` : `<span class="badge badge-gray">Past</span>`}</td>
    </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--gray-3);">No events yet</td></tr>';
    populateAttendanceDropdown();
  } catch {}
}

// ---- EVENTS ----
async function loadEvents() {
  try {
    const res  = await apiFetch('/api/events');
    const data = await res.json();
    allEvents  = data.events || [];
    renderEvents();
  } catch {}
}

function renderEvents() {
  const tbody = document.getElementById('adminEventsTbl');
  if (!allEvents.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--gray-3);">No events found</td></tr>'; return; }
  tbody.innerHTML = allEvents.map(e => `<tr>
    <td><strong>${e.name}</strong><br/><small style="color:var(--gray-3);">${e.category||'General'}</small></td>
    <td>${formatDate(e.date)}</td>
    <td>${e.venue}</td>
    <td>${e.seats_available} / ${e.total_seats}</td>
    <td>${e.registrations_count || 0}</td>
    <td style="display:flex;gap:6px;">
      <button class="btn btn-outline btn-sm" onclick="editEvent(${e.id})">✏️</button>
      <button class="btn btn-danger btn-sm"  onclick="confirmDelete(${e.id})">🗑</button>
    </td>
  </tr>`).join('');
}

async function saveEvent() {
  const id    = document.getElementById('editEventId').value;
  const name  = document.getElementById('evName').value.trim();
  const cat   = document.getElementById('evCat').value;
  const desc  = document.getElementById('evDesc').value.trim();
  const date  = document.getElementById('evDate').value;
  const time  = document.getElementById('evTime').value;
  const venue = document.getElementById('evVenue').value.trim();
  const seats = parseInt(document.getElementById('evSeats').value);
  const org   = document.getElementById('evOrg').value.trim();

  if (!name || !date || !venue || !seats) { showToast('Fill all required fields', 'error'); return; }

  const body = { name, category: cat, description: desc, date, time, venue, total_seats: seats, organizer: org };
  const path = id ? `/api/events/${id}` : '/api/events';
  const meth = id ? 'PUT' : 'POST';

  try {
    const res  = await apiFetch(path, meth, body);
    const data = await res.json();
    if (data.success) {
      showToast(id ? 'Event updated!' : 'Event created!', 'success');
      resetEventForm();
      await loadEvents();
      await loadDashboard();
      populateAttendanceDropdown();
    } else showToast(data.message || 'Failed', 'error');
  } catch { showToast('Server error', 'error'); }
}

function editEvent(id) {
  const e = allEvents.find(ev => ev.id === id);
  if (!e) return;
  document.getElementById('editEventId').value = e.id;
  document.getElementById('evName').value  = e.name;
  document.getElementById('evCat').value   = e.category || 'Other';
  document.getElementById('evDesc').value  = e.description || '';
  document.getElementById('evDate').value  = e.date?.split('T')[0] || e.date;
  document.getElementById('evTime').value  = e.time || '';
  document.getElementById('evVenue').value = e.venue;
  document.getElementById('evSeats').value = e.total_seats;
  document.getElementById('evOrg').value   = e.organizer || '';
  document.getElementById('createEventTitle').textContent = 'Edit Event';
  showSection('create-event', document.querySelector('[data-section=create-event]'));
}

function resetEventForm() {
  ['editEventId','evName','evDesc','evDate','evTime','evVenue','evSeats','evOrg'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('evCat').value = 'Technical';
  document.getElementById('createEventTitle').textContent = 'Create New Event';
}

let deleteTargetId = null;
function confirmDelete(id) {
  deleteTargetId = id;
  document.getElementById('deleteModal').classList.add('open');
  document.getElementById('confirmDeleteBtn').onclick = async () => {
    closeModal('deleteModal');
    try {
      const res  = await apiFetch(`/api/events/${deleteTargetId}`, 'DELETE');
      const data = await res.json();
      if (data.success) { showToast('Event deleted', 'success'); await loadEvents(); await loadDashboard(); }
      else showToast(data.message || 'Failed', 'error');
    } catch { showToast('Server error', 'error'); }
  };
}

// ---- STUDENTS ----
async function loadStudents() {
  try {
    const res  = await apiFetch('/api/admin/students');
    const data = await res.json();
    allStudents = data.students || [];
    renderStudents(allStudents);
  } catch {}
}

function renderStudents(students) {
  const tbody = document.getElementById('studentsTbl');
  if (!students.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--gray-3);">No students found</td></tr>'; return; }
  tbody.innerHTML = students.map(s => `<tr>
    <td><strong>${s.name}</strong></td>
    <td><span class="badge badge-blue">${s.roll_number}</span></td>
    <td>${s.email}</td>
    <td>${s.department}</td>
    <td>${s.year}</td>
    <td>${s.event_count || 0}</td>
  </tr>`).join('');
}

function filterStudents() {
  const q = document.getElementById('stuSearch').value.toLowerCase();
  renderStudents(allStudents.filter(s => s.name.toLowerCase().includes(q) || s.roll_number.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.department.toLowerCase().includes(q)));
}

// ---- ATTENDANCE ----
function populateAttendanceDropdown() {
  const sel = document.getElementById('attEvent');
  sel.innerHTML = '<option value="">-- Choose Event --</option>' +
    allEvents.map(e => `<option value="${e.id}">${e.name} (${formatDate(e.date)})</option>`).join('');
}

async function loadAttendanceList() {
  const eventId = document.getElementById('attEvent').value;
  if (!eventId) return;
  try {
    const res  = await apiFetch(`/api/admin/attendance/${eventId}`);
    const data = await res.json();
    attList    = data.registrations || [];
    renderAttList();
  } catch {}
}

function renderAttList() {
  const tbody = document.getElementById('attTbl');
  const attended = attList.filter(r => r.attended).length;
  document.getElementById('attStats').textContent = `${attended} / ${attList.length} attended`;
  if (!attList.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--gray-3);">No registrations for this event</td></tr>'; return; }
  tbody.innerHTML = attList.map(r => `<tr>
    <td><strong>${r.student_name}</strong></td>
    <td>${r.roll_number}</td>
    <td>${r.department}</td>
    <td>${r.attended ? `<span class="badge badge-green">✓ Present</span>` : `<span class="badge badge-gray">Absent</span>`}</td>
    <td>
      ${r.attended
        ? `<button class="btn btn-outline btn-sm" onclick="toggleAttendance(${r.registration_id}, false)">Undo</button>`
        : `<button class="btn btn-primary btn-sm" onclick="toggleAttendance(${r.registration_id}, true)">Mark Present</button>`
      }
    </td>
  </tr>`).join('');
}

async function toggleAttendance(regId, status) {
  try {
    const res  = await apiFetch('/api/admin/attendance', 'POST', { registration_id: regId, attended: status });
    const data = await res.json();
    if (data.success) {
      showToast(status ? 'Marked present!' : 'Attendance removed', 'success');
      await loadAttendanceList();
      await loadDashboard();
    } else showToast(data.message || 'Failed', 'error');
  } catch { showToast('Server error', 'error'); }
}

async function markAttendanceQR() {
  const eventId = document.getElementById('attEvent').value;
  const qrInput = document.getElementById('qrInput').value.trim();
  if (!eventId) { showToast('Select an event first', 'error'); return; }
  if (!qrInput) { showToast('Enter roll number or scan QR', 'error'); return; }

  let rollNumber = qrInput;
  try { const parsed = JSON.parse(qrInput); rollNumber = parsed.roll || qrInput; } catch {}

  try {
    const res  = await apiFetch('/api/admin/attendance/qr', 'POST', { event_id: parseInt(eventId), roll_number: rollNumber });
    const data = await res.json();
    if (data.success) {
      showToast(`✅ ${data.student_name} marked present!`, 'success');
      document.getElementById('qrInput').value = '';
      await loadAttendanceList();
      await loadDashboard();
    } else showToast(data.message || 'Failed', 'error');
  } catch { showToast('Server error', 'error'); }
}

// ---- UTILS ----
function showSection(name, el) {
  document.querySelectorAll('section[id^="sec-"]').forEach(s => s.style.display = 'none');
  document.getElementById(`sec-${name}`).style.display = 'block';
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  document.getElementById('pageTitle').textContent = {
    dashboard: 'Dashboard', events: 'Manage Events',
    'create-event': 'Create Event', students: 'All Students', attendance: 'Attendance'
  }[name] || name;
}
function logout() { localStorage.clear(); window.location.href = 'login.html'; }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
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
