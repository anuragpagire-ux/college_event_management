"""
College Event Management System - Backend
Flask + SQLite
Run: python app.py
"""

from flask import Flask, request, jsonify, send_from_directory, redirect
from flask_cors import CORS
import sqlite3, hashlib, secrets, os, json, random, smtplib
from email.mime.text import MIMEText
from datetime import datetime, timedelta
from functools import wraps

# Load .env file if present (for local development)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend')

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')
CORS(app)

@app.route('/')
def serve_index():
    return redirect('/login.html')

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database.db')
SECRET  = 'NWC_SECRET_KEY_2024'

# ==================== OTP EMAIL CONFIG ====================
# Set SMTP_ENABLED = True and fill in your details to send real emails
# (e.g. Gmail SMTP needs an "App Password", not your normal password).
# Until then, every OTP is printed to this console so the forgot-password
# flow still works end-to-end for local testing.
SMTP_ENABLED  = True
SMTP_HOST     = 'smtp.gmail.com'
SMTP_PORT     = 587
SMTP_EMAIL    = 'anuragpagire@gmail.com'
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', 'your-gmail-app-password-here')

# ==================== DB SETUP ====================

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'student',
        roll_number TEXT UNIQUE,
        department TEXT,
        year TEXT,
        phone TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        time TEXT,
        venue TEXT NOT NULL,
        category TEXT DEFAULT 'General',
        total_seats INTEGER DEFAULT 100,
        seats_available INTEGER DEFAULT 100,
        organizer TEXT,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(created_by) REFERENCES users(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        event_id INTEGER NOT NULL,
        attended INTEGER DEFAULT 0,
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, event_id),
        FOREIGN KEY(student_id) REFERENCES users(id),
        FOREIGN KEY(event_id)   REFERENCES events(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS password_resets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        otp TEXT NOT NULL,
        reset_token TEXT,
        verified INTEGER DEFAULT 0,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')

    # Seed default admin
    admin_pw = hash_password('admin123')
    c.execute('''INSERT OR IGNORE INTO users (name, email, password, role, roll_number, department, year)
                 VALUES (?, ?, ?, ?, ?, ?, ?)''',
              ('Admin', 'anuragpagire@gmail.com', admin_pw, 'admin', 'ADMIN001', 'Administration', 'N/A'))

    # Note: No default student seeded — students create their own accounts via Register

    # Seed sample events
    sample_events = [
        ('Annual Tech Fest 2024', 'The biggest tech event of the year with competitions, workshops and more!',
         '2024-12-20', '09:00', 'Main Auditorium', 'Technical', 200, 200, 'CS Department'),
        ('Cultural Night', 'Enjoy music, dance and drama performances by students.',
         '2024-12-22', '18:00', 'Open Air Theatre', 'Cultural', 500, 500, 'Students Union'),
        ('Entrepreneurship Workshop', 'Learn from industry experts about starting your own venture.',
         '2024-12-18', '10:00', 'Seminar Hall A', 'Workshop', 80, 80, 'Management Dept'),
        ('Sports Day', 'Inter-department sports competition.',
         '2024-12-25', '08:00', 'College Ground', 'Sports', 400, 400, 'Sports Committee'),
    ]
    for ev in sample_events:
        c.execute('''INSERT OR IGNORE INTO events (name, description, date, time, venue, category, total_seats, seats_available, organizer)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''', ev)

    conn.commit()
    conn.close()
    print("✅ Database initialised")

# ==================== AUTH HELPERS ====================

def hash_password(pw):
    return hashlib.sha256((pw + SECRET).encode()).hexdigest()

def generate_otp():
    return f"{random.randint(100000, 999999)}"

def send_otp_email(to_email, otp, name='there'):
    # Always print to the backend console — this guarantees the OTP flow
    # works for local testing even before real SMTP credentials are set.
    print("\n" + "=" * 50)
    print(f"📧  Password reset OTP requested for: {to_email}")
    print(f"🔑  OTP CODE: {otp}")
    print(f"⏱   Valid for 10 minutes")
    print("=" * 50 + "\n")

    if not SMTP_ENABLED:
        return

    try:
        body = (f"Hello {name},\n\n"
                f"Your OTP for resetting your College Event Portal password is: {otp}\n"
                f"This code is valid for 10 minutes.\n\n"
                f"If you did not request this, you can safely ignore this email.\n\n"
                f"- College Event Portal")
        msg = MIMEText(body)
        msg['Subject'] = 'College Event Portal - Password Reset OTP'
        msg['From'] = SMTP_EMAIL
        msg['To'] = to_email

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.send_message(msg)
        print(f"✅ OTP email sent to {to_email}")
    except Exception as e:
        print(f"⚠️  Could not send OTP email ({e}). Use the OTP printed above instead.")

def create_token(user_id):
    conn = get_db()
    tok  = secrets.token_hex(32)
    exp  = datetime.now() + timedelta(hours=24)
    conn.execute('INSERT INTO tokens (user_id, token, expires_at) VALUES (?, ?, ?)', (user_id, tok, exp))
    conn.commit(); conn.close()
    return tok

def get_user_from_token(tok):
    conn = get_db()
    row  = conn.execute('''SELECT u.* FROM users u JOIN tokens t ON u.id=t.user_id
                           WHERE t.token=? AND t.expires_at > ?''',
                        (tok, datetime.now())).fetchone()
    conn.close()
    return dict(row) if row else None

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get('Authorization', '')
        tok  = auth.replace('Bearer ', '').strip()
        user = get_user_from_token(tok)
        if not user: return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        return f(user, *args, **kwargs)
    return decorated

def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get('Authorization', '')
        tok  = auth.replace('Bearer ', '').strip()
        user = get_user_from_token(tok)
        if not user or user['role'] != 'admin':
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        return f(user, *args, **kwargs)
    return decorated

# ==================== ROUTES ====================

@app.route('/')
def index():
    return jsonify({'message': 'NWC Event Management API', 'status': 'running'})

# ---- AUTH ----

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    pw    = hash_password(data.get('password', ''))
    role  = data.get('role', 'student')

    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE email=? AND password=? AND role=?',
                        (email, pw, role)).fetchone()
    conn.close()

    if not user:
        return jsonify({'success': False, 'message': 'Invalid email, password or role.'})

    user = dict(user)
    tok  = create_token(user['id'])
    user.pop('password', None)
    return jsonify({'success': True, 'token': tok, 'role': user['role'], 'user': user})

@app.route('/api/register', methods=['POST'])
def register():
    d = request.get_json()
    required = ['name', 'email', 'password', 'roll_number', 'department', 'year']
    if not all(d.get(k) for k in required):
        return jsonify({'success': False, 'message': 'All fields are required.'})

    pw = hash_password(d['password'])
    conn = get_db()
    try:
        conn.execute('''INSERT INTO users (name, email, password, roll_number, department, year, phone, role)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                     (d['name'], d['email'].lower(), pw, d['roll_number'],
                      d['department'], d['year'], d.get('phone', ''), 'student'))
        conn.commit()
        return jsonify({'success': True, 'message': 'Account created successfully!'})
    except sqlite3.IntegrityError as e:
        err = str(e)
        if 'email' in err:    msg = 'Email already registered.'
        elif 'roll' in err:   msg = 'Roll number already exists.'
        else:                  msg = 'Registration failed.'
        return jsonify({'success': False, 'message': msg})
    finally:
        conn.close()

# ---- FORGOT PASSWORD (OTP) ----

@app.route('/api/forgot-password/send-otp', methods=['POST'])
def forgot_password_send_otp():
    d     = request.get_json()
    email = d.get('email', '').strip().lower()
    if not email:
        return jsonify({'success': False, 'message': 'Email is required.'})

    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
    if not user:
        conn.close()
        return jsonify({'success': False, 'message': 'No account found with this email address.'})

    otp     = generate_otp()
    expires = datetime.now() + timedelta(minutes=10)
    conn.execute('DELETE FROM password_resets WHERE email=?', (email,))
    conn.execute('INSERT INTO password_resets (email, otp, expires_at) VALUES (?, ?, ?)',
                 (email, otp, expires))
    conn.commit()
    conn.close()

    send_otp_email(email, otp, user['name'])
    return jsonify({'success': True, 'message': f'A 6-digit OTP has been sent to {email}.'})

@app.route('/api/forgot-password/verify-otp', methods=['POST'])
def forgot_password_verify_otp():
    d     = request.get_json()
    email = d.get('email', '').strip().lower()
    otp   = d.get('otp', '').strip()

    conn = get_db()
    rec = conn.execute('''SELECT * FROM password_resets
                          WHERE email=? AND otp=? AND verified=0 AND expires_at > ?
                          ORDER BY id DESC LIMIT 1''',
                       (email, otp, datetime.now())).fetchone()
    if not rec:
        conn.close()
        return jsonify({'success': False, 'message': 'Invalid or expired OTP.'})

    reset_token = secrets.token_hex(32)
    new_expiry  = datetime.now() + timedelta(minutes=10)
    conn.execute('UPDATE password_resets SET verified=1, reset_token=?, expires_at=? WHERE id=?',
                 (reset_token, new_expiry, rec['id']))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'OTP verified.', 'reset_token': reset_token})

@app.route('/api/forgot-password/reset', methods=['POST'])
def forgot_password_reset():
    d            = request.get_json()
    email        = d.get('email', '').strip().lower()
    reset_token  = d.get('reset_token', '').strip()
    new_password = d.get('new_password', '')

    if not new_password or len(new_password) < 6:
        return jsonify({'success': False, 'message': 'Password must be at least 6 characters.'})

    conn = get_db()
    rec = conn.execute('''SELECT * FROM password_resets
                          WHERE email=? AND reset_token=? AND verified=1 AND expires_at > ?
                          ORDER BY id DESC LIMIT 1''',
                       (email, reset_token, datetime.now())).fetchone()
    if not rec:
        conn.close()
        return jsonify({'success': False, 'message': 'Reset session expired. Please request a new OTP.'})

    user = conn.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
    if not user:
        conn.close()
        return jsonify({'success': False, 'message': 'Account not found.'})

    hashed = hash_password(new_password)
    conn.execute('UPDATE users SET password=? WHERE id=?', (hashed, user['id']))
    conn.execute('DELETE FROM password_resets WHERE email=?', (email,))
    conn.execute('DELETE FROM tokens WHERE user_id=?', (user['id'],))  # log out old sessions
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Password reset successful! Please login with your new password.'})

# ---- EVENTS (Public) ----

@app.route('/api/events', methods=['GET'])
def get_events():
    conn = get_db()
    rows = conn.execute('''
        SELECT e.*, COUNT(r.id) as registrations_count
        FROM events e LEFT JOIN registrations r ON e.id = r.event_id
        GROUP BY e.id ORDER BY e.date ASC
    ''').fetchall()
    conn.close()
    return jsonify({'success': True, 'events': [dict(r) for r in rows]})

@app.route('/api/events', methods=['POST'])
@require_admin
def create_event(admin):
    d = request.get_json()
    required = ['name', 'date', 'venue', 'total_seats']
    if not all(d.get(k) for k in required):
        return jsonify({'success': False, 'message': 'Fill all required fields.'})

    seats = int(d['total_seats'])
    conn  = get_db()
    conn.execute('''INSERT INTO events (name, description, date, time, venue, category, total_seats, seats_available, organizer, created_by)
                    VALUES (?,?,?,?,?,?,?,?,?,?)''',
                 (d['name'], d.get('description',''), d['date'], d.get('time',''),
                  d['venue'], d.get('category','General'), seats, seats,
                  d.get('organizer',''), admin['id']))
    conn.commit(); conn.close()
    return jsonify({'success': True, 'message': 'Event created!'})

@app.route('/api/events/<int:eid>', methods=['PUT'])
@require_admin
def update_event(admin, eid):
    d    = request.get_json()
    conn = get_db()
    ev   = conn.execute('SELECT * FROM events WHERE id=?', (eid,)).fetchone()
    if not ev:
        conn.close()
        return jsonify({'success': False, 'message': 'Event not found.'})

    seats = int(d.get('total_seats', ev['total_seats']))
    diff  = seats - ev['total_seats']
    new_avail = max(0, ev['seats_available'] + diff)

    conn.execute('''UPDATE events SET name=?, description=?, date=?, time=?, venue=?,
                    category=?, total_seats=?, seats_available=?, organizer=? WHERE id=?''',
                 (d.get('name', ev['name']), d.get('description', ev['description']),
                  d.get('date', ev['date']), d.get('time', ev['time']),
                  d.get('venue', ev['venue']), d.get('category', ev['category']),
                  seats, new_avail, d.get('organizer', ev['organizer']), eid))
    conn.commit(); conn.close()
    return jsonify({'success': True, 'message': 'Event updated!'})

@app.route('/api/events/<int:eid>', methods=['DELETE'])
@require_admin
def delete_event(admin, eid):
    conn = get_db()
    conn.execute('DELETE FROM registrations WHERE event_id=?', (eid,))
    conn.execute('DELETE FROM events WHERE id=?', (eid,))
    conn.commit(); conn.close()
    return jsonify({'success': True, 'message': 'Event deleted.'})

# ---- STUDENT ----

@app.route('/api/register-event', methods=['POST'])
@require_auth
def register_event(user):
    d       = request.get_json()
    eid     = d.get('event_id')
    conn    = get_db()
    ev      = conn.execute('SELECT * FROM events WHERE id=?', (eid,)).fetchone()
    if not ev:
        conn.close()
        return jsonify({'success': False, 'message': 'Event not found.'})
    if ev['seats_available'] <= 0:
        conn.close()
        return jsonify({'success': False, 'message': 'No seats available.'})
    try:
        conn.execute('INSERT INTO registrations (student_id, event_id) VALUES (?,?)', (user['id'], eid))
        conn.execute('UPDATE events SET seats_available = seats_available - 1 WHERE id=?', (eid,))
        conn.commit()
        return jsonify({'success': True, 'message': 'Registered successfully!'})
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'message': 'Already registered for this event.'})
    finally:
        conn.close()

@app.route('/api/student/registrations', methods=['GET'])
@require_auth
def student_registrations(user):
    conn = get_db()
    rows = conn.execute('''
        SELECT r.*, e.name as event_name, e.date as event_date, e.venue
        FROM registrations r JOIN events e ON r.event_id = e.id
        WHERE r.student_id = ? ORDER BY r.registered_at DESC
    ''', (user['id'],)).fetchall()
    conn.close()
    return jsonify({'success': True, 'registrations': [dict(r) for r in rows]})

@app.route('/api/student/profile', methods=['PUT'])
@require_auth
def update_profile(user):
    d    = request.get_json()
    name = d.get('name', '').strip()
    ph   = d.get('phone', '').strip()
    if not name: return jsonify({'success': False, 'message': 'Name is required.'})
    conn = get_db()
    conn.execute('UPDATE users SET name=?, phone=? WHERE id=?', (name, ph, user['id']))
    conn.commit(); conn.close()
    return jsonify({'success': True, 'message': 'Profile updated!'})

# ---- ADMIN ----

@app.route('/api/admin/stats', methods=['GET'])
@require_admin
def admin_stats(admin):
    conn = get_db()
    ev   = conn.execute('SELECT COUNT(*) as c FROM events').fetchone()['c']
    st   = conn.execute('SELECT COUNT(*) as c FROM users WHERE role=?', ('student',)).fetchone()['c']
    rg   = conn.execute('SELECT COUNT(*) as c FROM registrations').fetchone()['c']
    at   = conn.execute('SELECT COUNT(*) as c FROM registrations WHERE attended=1').fetchone()['c']
    conn.close()
    return jsonify({'success': True, 'events': ev, 'students': st, 'registrations': rg, 'attendances': at})

@app.route('/api/admin/students', methods=['GET'])
@require_admin
def admin_students(admin):
    conn = get_db()
    rows = conn.execute('''
        SELECT u.*, COUNT(r.id) as event_count
        FROM users u LEFT JOIN registrations r ON u.id = r.student_id
        WHERE u.role = 'student'
        GROUP BY u.id ORDER BY u.name
    ''').fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r); d.pop('password', None); result.append(d)
    return jsonify({'success': True, 'students': result})

@app.route('/api/admin/attendance/<int:eid>', methods=['GET'])
@require_admin
def get_attendance(admin, eid):
    conn = get_db()
    rows = conn.execute('''
        SELECT r.id as registration_id, r.attended, r.registered_at,
               u.name as student_name, u.roll_number, u.department, u.email
        FROM registrations r JOIN users u ON r.student_id = u.id
        WHERE r.event_id = ? ORDER BY u.name
    ''', (eid,)).fetchall()
    conn.close()
    return jsonify({'success': True, 'registrations': [dict(r) for r in rows]})

@app.route('/api/admin/attendance', methods=['POST'])
@require_admin
def mark_attendance(admin):
    d     = request.get_json()
    rid   = d.get('registration_id')
    state = 1 if d.get('attended') else 0
    conn  = get_db()
    conn.execute('UPDATE registrations SET attended=? WHERE id=?', (state, rid))
    conn.commit(); conn.close()
    return jsonify({'success': True})

@app.route('/api/admin/attendance/qr', methods=['POST'])
@require_admin
def mark_attendance_qr(admin):
    d    = request.get_json()
    eid  = d.get('event_id')
    roll = d.get('roll_number', '').strip()
    conn = get_db()
    stu  = conn.execute('SELECT * FROM users WHERE roll_number=?', (roll,)).fetchone()
    if not stu:
        conn.close()
        return jsonify({'success': False, 'message': f'Student with roll {roll} not found.'})

    reg = conn.execute('SELECT * FROM registrations WHERE student_id=? AND event_id=?',
                       (stu['id'], eid)).fetchone()
    if not reg:
        conn.close()
        return jsonify({'success': False, 'message': f'{stu["name"]} is not registered for this event.'})

    if reg['attended']:
        conn.close()
        return jsonify({'success': False, 'message': f'{stu["name"]} already marked present.'})

    conn.execute('UPDATE registrations SET attended=1 WHERE id=?', (reg['id'],))
    conn.commit(); conn.close()
    return jsonify({'success': True, 'student_name': stu['name'], 'message': 'Attendance marked!'})

# ==================== MAIN ====================

init_db()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print("\n🎓 NWC Event Management System - Backend")
    print("=" * 45)
    print(f"🌐 API URL  : http://127.0.0.1:{port}")
    print(f"👤 Admin    : anuragpagire@gmail.com / admin123")
    print("=" * 45)
    app.run(host='0.0.0.0', debug=False, port=port)
