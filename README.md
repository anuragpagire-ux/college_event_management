# 🎓 NWC College Event Management System

**Nowrosjee Wadia College, Pune**  
Full-stack web application — Flask (Python) + SQLite backend, HTML/CSS/JS frontend.

---

## 📁 Project Structure

```
college_event_management/
├── frontend/
│   ├── login.html          ← Login page (Student & Admin tabs)
│   ├── register.html       ← Student registration
│   ├── student.html        ← Student dashboard
│   ├── admin.html          ← Admin dashboard
│   ├── css/
│   │   ├── login.css
│   │   ├── register.css
│   │   └── dashboard.css   ← Shared dashboard styles
│   └── js/
│       ├── login.js
│       ├── register.js
│       ├── student.js
│       └── admin.js
└── backend/
    ├── app.py              ← Flask API server
    ├── requirements.txt
    └── database.db         ← Auto-created on first run
```

---

## ✅ STEP-BY-STEP SETUP GUIDE

### STEP 1 — Install Python
Make sure Python 3.8+ is installed.  
Check: `python --version`  
Download from https://www.python.org if needed.

---

### STEP 2 — Install Backend Dependencies

Open a terminal and navigate to the **backend** folder:

```bash
cd college_event_management/backend
pip install -r requirements.txt
```

---

### STEP 3 — Start the Backend Server

```bash
python app.py
```

You should see:
```
✅ Database initialised
🎓 NWC Event Management System - Backend
=============================================
🌐 API URL  : http://127.0.0.1:5000
👤 Admin    : admin@nwcpune.ac.in / admin123
👥 Student  : rahul@nwcpune.ac.in / student123
=============================================
```

> Keep this terminal open while using the app.

---

### STEP 4 — Open the Frontend

**Option A — Simple (Double-click)**  
Open `frontend/login.html` directly in your browser.

**Option B — Local Server (Recommended)**  
Open a **second terminal** and run:

```bash
cd college_event_management/frontend
python -m http.server 8080
```

Then visit: **http://localhost:8080/login.html**

---

### STEP 5 — Login & Explore

**Admin Login**
- Email: `admin@nwcpune.ac.in`
- Password: `admin123`
- Tab: Admin

**Student Login**
- Email: `rahul@nwcpune.ac.in`
- Password: `student123`
- Tab: Student

**New Student?**
- Click "Create Account" on the login page to register.

---

## 🌟 Features

| Feature | Description |
|---|---|
| **Login Page** | NWC logo, Student/Admin tab switcher, dark navy + gold theme |
| **Student Registration** | Full registration form with department, year, roll number |
| **Browse Events** | View all events with seats, category, date |
| **Event Registration** | One-click registration with seat tracking |
| **QR / ID Card** | Auto-generated QR code + digital student ID card |
| **Attendance** | Admin marks attendance by QR scan or roll number |
| **Admin Dashboard** | Stats, event CRUD, student list |
| **Create Events** | Name, date, venue, seats, category, organizer |
| **Delete / Edit Events** | Full event management |

---

## 🔑 Default Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@nwcpune.ac.in | admin123 |
| Student | rahul@nwcpune.ac.in | student123 |

> Change admin password after first login by modifying `init_db()` in `app.py`.

---

## 🎨 Theme

- **Primary**: Deep Navy `#0A1628` + Royal Blue `#1A3A6C`
- **Accent**: Gold `#C9922A`
- **Background**: Cream `#FAF7F2`
- **Font**: Inter + Playfair Display (Google Fonts)

---

## 🔧 API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/login | — | Login |
| POST | /api/register | — | Register student |
| GET  | /api/events | — | All events |
| POST | /api/events | Admin | Create event |
| PUT  | /api/events/:id | Admin | Update event |
| DELETE | /api/events/:id | Admin | Delete event |
| POST | /api/register-event | Student | Register for event |
| GET  | /api/student/registrations | Student | My registrations |
| PUT  | /api/student/profile | Student | Update profile |
| GET  | /api/admin/stats | Admin | Dashboard stats |
| GET  | /api/admin/students | Admin | All students |
| GET  | /api/admin/attendance/:id | Admin | Attendance list |
| POST | /api/admin/attendance | Admin | Mark attendance |
| POST | /api/admin/attendance/qr | Admin | QR attendance |

---

## 📦 Technologies Used

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Python 3, Flask, Flask-CORS |
| Database | SQLite (via Python sqlite3) |
| QR Code | qrcodejs (CDN) |
| Fonts | Google Fonts (Inter + Playfair Display) |

---

## ❓ Troubleshooting

**"Server not reachable" error**  
→ Make sure `python app.py` is running in the backend folder.

**CORS error in browser**  
→ Use the `python -m http.server 8080` method to serve frontend files.

**Port 5000 already in use**  
→ Change `port=5000` to `port=5001` at the bottom of `app.py`, and update `const API` in all JS files.

**Database issues**  
→ Delete `backend/database.db` and restart the server to reset.

---

*Built for Nowrosjee Wadia College, Pune — College Event Management System 2024*
