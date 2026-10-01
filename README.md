# 🎓 Campus Companion

> *"Lost? Hungry? Late? Need help? Campus Companion knows where to go."*

**Campus Companion** is a mobile-first, full-stack web application designed for college students to navigate campus life in real time. Built with a clean vanilla JavaScript frontend and a high-performance Express + SQLite backend, it delivers instant campus intelligence with zero mock data, real database persistence, and crowdsourced live statuses.

---

## ⚡ Quick Start (One Command)

The entire application runs with a single command. The SQLite database is created and seeded automatically on first run.

```bash
# 1. Install dependencies
npm install

# 2. Start the server (auto-seeds campus.db if empty)
npm start
```

Open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Demo Credentials

The database comes pre-seeded with two accounts for instant testing:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Student** | `student@campus.com` | `student123` | Upvote, report issues, register for events, post lost items, vote crowd |
| **Admin** | `admin@campus.com` | `admin123` | Manage issues, edit menu prices/availability, create/delete events, override statuses |

*Tip: The login modal includes 1-click **"👤 Demo Student"** and **"🛡️ Demo Admin"** shortcut buttons for quick testing during hackathon evaluations.*

---

## ✨ Features

### 1. ⚡ "What's Near Me?" (Hero Feature)
- Instant category chips: **Charging, Food, Washroom, Study, Printing, Water, Parking**.
- Live status indicators (**Available**, **Busy**, **Full**) with relative update timestamps (*"updated 5 min ago"*).
- Universal search bar covering campus places, upcoming events, and lost items via `GET /api/search?q=`.
- **Today Pulse Feed**: highlights the next event, live canteen crowd meter, next departing bus shuttle, and count of user's open issues.

### 2. 🗺️ Campus Places & Navigator
- Detailed directory of 16+ campus spots across departments and academic blocks.
- **Turn-by-turn text route directions** for every building, floor, and landmark.
- **Crowdsourced Live Status**: Any student can tap *"Update status"* to flag a spot as Available, Busy, or Full.

### 3. 📅 Campus Events
- Events categorized dynamically as **Today**, **Tomorrow**, and **Upcoming / Later**.
- Category filter chips: *Technical, Workshop, Sports, Cultural, Career & Placement, Club Activity*.
- Real-time seat registration stored in the database with duplicate prevention.
- Admin dashboard to publish new events and delete concluded ones.

### 4. 🛠️ Campus Issue Tracker & Community Voting
- Issue submission form with building dropdown, category selection (*fan, light, water leakage, washroom, furniture, dustbin, other*), description, and **photo uploads** via `multer`.
- Unique issue tracking numbers (e.g. `#101`).
- **Community prioritization**: Students tap *"+1 I see this too"* (1 vote per user per issue).
- **"My Reports" Tab**: Step-by-step visual status timeline (*Reported ➔ In Progress ➔ Resolved*).
- Administrators can transition issue states in real time.

### 5. 🔍 Lost & Found Portal
- Post lost or found items with title, category, description, campus location, contact info, and optional photos.
- Filter by *Lost* vs *Found* items.
- Original poster or campus admin can mark items as **"Returned / Claimed"**.

### 6. 🍽️ Canteen Corner & Live Crowd Meter
- Today's cafeteria menu with prices in INR (₹) and real-time availability badges.
- **Crowd Meter**: Aggregates student votes from the past 30 minutes to calculate live density (*Low, Medium, High*) and estimated wait times (*5-10 mins, 15-20 mins, 25-35 mins*).
- Campus admin controls to toggle item stock and update prices.

### 7. 🚌 Campus Bus Schedules
- Route listings with pickup bays, destination corridors, and full day departure timetables.
- **Smart Next Bus**: Automatically computes and highlights the closest upcoming departure relative to current system time.

### 8. 🚨 Quick Help & Emergency Contacts
- Tap-to-call direct `tel:` links for **Campus Health Clinic & Ambulance (24x7)**, **Chief Security**, **Fire & Safety**, and the **Student Proctor**.
- Direct quick shortcut to report physical safety hazards.

### 9. 🛡️ Admin Command Center
- Dedicated administration view to oversee open maintenance issues, edit canteen offerings, publish/delete events, and override place statuses.

---

## 📂 Project Structure

```
campus-companion/
├── campus.db                  # SQLite database file (created & auto-seeded on launch)
├── package.json               # Scripts and dependencies
├── .env.example               # Environment variables template
├── README.md                  # Complete documentation
│
├── server/                    # Node.js + Express Backend
│   ├── index.js               # Express application entrypoint and SPA routing
│   ├── campusConfig.js        # Config file: College name, buildings, and categories
│   ├── db.js                  # better-sqlite3 database connection and schema initialization
│   ├── seed.js                # Database seeder with realistic Indian college dataset
│   ├── middleware/
│   │   ├── auth.js            # JWT verification, requireAuth & requireAdmin middleware
│   │   └── upload.js          # Multer storage configuration for image uploads
│   └── routes/
│       ├── auth.js            # POST /signup, POST /login, GET /me
│       ├── places.js          # GET /places, POST /places/:id/status
│       ├── events.js          # GET /events, POST /events, DELETE /:id, POST /:id/register
│       ├── issues.js          # GET /issues, POST /issues, POST /:id/upvote, PATCH /:id/status, GET /mine
│       ├── lostfound.js       # GET /lostfound, POST /lostfound, PATCH /:id/resolve
│       ├── canteen.js         # GET /menu, PATCH /menu/:id, GET /crowd, POST /crowd
│       ├── bus.js             # GET /bus
│       ├── contacts.js        # GET /contacts
│       ├── search.js          # GET /search?q=
│       └── today.js           # GET /today (dashboard summary feed)
│
├── public/                    # Frontend (Pure Vanilla HTML5 / CSS3 / ES6+)
│   ├── index.html             # Single Page Application HTML markup
│   ├── css/
│   │   └── style.css          # Responsive mobile-first CSS design system
│   └── js/
│       ├── api.js             # Reusable async Fetch API client with auth token handling
│       └── app.js             # SPA client router, state manager, modals & 15s live polling
│
└── uploads/                   # Uploaded photo files storage directory
```

---

## 🔌 Complete REST API Reference

All endpoints return consistent JSON formatted as `{ success: true, data: ... }` or `{ success: false, error: "..." }`.

| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/signup` | No | Public | Register a new student account (`name`, `email`, `password`) |
| **POST** | `/api/auth/login` | No | Public | Authenticate user & receive JWT token |
| **GET** | `/api/auth/me` | Yes | Any | Retrieve authenticated profile |
| **GET** | `/api/places?type=` | Optional | Public | List campus places, filterable by type |
| **POST** | `/api/places/:id/status` | Yes | Student/Admin | Update crowdsourced spot status (`Available`, `Busy`, `Full`) |
| **GET** | `/api/events` | Optional | Public | List events with registration counts & user registration flag |
| **POST** | `/api/events` | Yes | Admin | Publish a new campus event |
| **DELETE**| `/api/events/:id` | Yes | Admin | Remove an event and associated registrations |
| **POST** | `/api/events/:id/register` | Yes | Student/Admin | Register for an event (prevents duplicates) |
| **GET** | `/api/issues` | Optional | Public | List all issues sorted by community upvotes DESC |
| **POST** | `/api/issues` | Yes | Student/Admin | Report an issue (supports `multipart/form-data` with photo) |
| **POST** | `/api/issues/:id/upvote` | Yes | Student/Admin | Cast a `+1 I see this too` vote (1 vote per user) |
| **PATCH**| `/api/issues/:id/status` | Yes | Admin | Transition issue status (`Reported`, `In Progress`, `Resolved`) |
| **GET** | `/api/issues/mine` | Yes | Student/Admin | Fetch personal reported issues and timeline history |
| **GET** | `/api/lostfound?type=&category=&q=` | Optional | Public | Search and filter lost and found board |
| **POST** | `/api/lostfound` | Yes | Student/Admin | Post lost or found item (supports photo upload) |
| **PATCH**| `/api/lostfound/:id/resolve`| Yes | Owner/Admin | Mark item as `Returned / Claimed` |
| **GET** | `/api/canteen/menu` | No | Public | Fetch current canteen items and pricing |
| **PATCH**| `/api/canteen/menu/:id` | Yes | Admin | Update item availability and price |
| **GET** | `/api/canteen/crowd` | No | Public | Get computed crowd level from last 30 min votes |
| **POST** | `/api/canteen/crowd` | Yes | Student/Admin | Cast crowd density vote (`Low`, `Medium`, `High`) |
| **GET** | `/api/bus` | No | Public | List bus routes with dynamic next bus indicator |
| **GET** | `/api/contacts` | No | Public | Emergency contacts with phone numbers |
| **GET** | `/api/search?q=` | No | Public | Unified search across places, events, and lost items |
| **GET** | `/api/today` | Optional | Public | Real-time home dashboard summary card |
| **GET** | `/api/config` | No | Public | College name and campus building list |

---

## 🛠️ Configuration & Customization

The college name, short code, and building list are centrally managed in `server/campusConfig.js`:

```javascript
module.exports = {
  collegeName: "Apex Institute of Technology",
  shortName: "AIT Campus",
  tagline: "Lost? Hungry? Late? Need help? Campus Companion knows where to go.",
  buildings: [
    "Aryabhata Academic Block",
    "Ramanujan IT & Computing Block",
    "Kalam Science & Research Center",
    "Visvesvaraya Tech Center",
    "Central Library & Study Commons",
    "Student Activity Center & Food Court",
    "Sports Pavilion & Ground"
  ]
};
```
Change these values to rebrand the app for any university or college campus in seconds.

---

## 🧪 Verification & Automated Tests

To execute the automated end-to-end API test suite covering all 25 endpoints:

```bash
node test_api.js
```

All 25 endpoints validate input sanitization, JWT authorization, database integrity, file uploads, and role-based access controls.
