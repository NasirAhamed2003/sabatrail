# SabaTrail 🗺️

**A one-day visit planner for Hemmathagama, Sri Lanka, and locations within 25 km.**

SabaTrail helps visitors discover and plan visits to real places of interest — temples, scenic spots, heritage sites, restaurants, and more — all within a 25 km radius of Hemmathagama town centre. It provides rich place details, an interactive Leaflet/OpenStreetMap map, road-distance and driving-time data via OSRM, and a personal day-plan builder.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Database Setup](#2-database-setup)
  - [3. Backend Setup](#3-backend-setup)
  - [4. Frontend Setup](#4-frontend-setup)
- [Running the Application](#running-the-application)
- [Seed Data & Admin Account](#seed-data--admin-account)
- [Testing](#testing)
- [Environment Variables Reference](#environment-variables-reference)
- [External Services](#external-services)

---

## Features

| Feature | Description |
|---|---|
| 🗺️ Interactive Map | Browse all 21 places on an OpenStreetMap-powered Leaflet map |
| 🔍 Filter & Search | Filter places by category (Religious, Nature/Scenic, Heritage/Cultural, Recreational, Restaurants/Dining, Public/Useful) |
| 📍 Place Details | Full details including description, opening hours, facilities, travel tips, suitability, and photo |
| 📏 Auto-Distance | Real road distances and driving times from OSRM; falls back to straight-line distance if unavailable |
| 📅 Day Planner | Authenticated users can create, name, reorder, and manage personal visit plans |
| 🔐 Authentication | JWT-based register/login; role-based access (USER / ADMIN) |
| 🛡️ Admin Panel | Admins can create, edit, and delete places and categories; upload place photos |
| 📷 Photo Uploads | JPEG/PNG/WebP up to 5 MB; saved as UUID-named files under `backend/uploads/` |
| 🧪 API Tests | 27 automated integration tests via Node's built-in test runner |
| 📮 Postman Suite | 36-request end-to-end Postman collection |

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express 5 |
| Language | TypeScript |
| ORM | Prisma 7 (prisma-client + adapter-mariadb) |
| Database | MySQL 8 / MariaDB 10.6+ |
| Auth | JWT (`jsonwebtoken`), bcrypt (`bcryptjs`) |
| Validation | Zod |
| File Upload | Multer |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 19 + Vite |
| Language | TypeScript |
| Routing | React Router v7 |
| Map | Leaflet + React-Leaflet |
| HTTP Client | Axios |

---

## Project Structure

```
SabaTrail Project/
├── backend/
│   ├── Src/
│   │   ├── app.ts               # Express app, CORS, routes
│   │   ├── server.ts            # HTTP server entry point
│   │   ├── config.ts            # Environment config helper
│   │   ├── geo.ts               # Haversine distance calculation
│   │   ├── validation.ts        # Zod validation schemas
│   │   ├── uploads.ts           # Multer upload configuration
│   │   ├── prisma.ts            # Prisma client singleton
│   │   ├── controllers/         # Route handler logic
│   │   │   ├── authController.ts
│   │   │   ├── categoryController.ts
│   │   │   ├── placeController.ts
│   │   │   ├── visitPlanController.ts
│   │   │   ├── visitPlanPlaceController.ts
│   │   │   └── uploadController.ts
│   │   ├── routes/              # Express route definitions
│   │   └── middleware/          # Auth & admin middleware
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema (5 models)
│   │   ├── seed.ts              # 21 real places + categories + admin
│   │   └── migrations/          # Prisma migration history
│   ├── tests/                   # 27 integration tests
│   ├── postman/                 # Postman collection (36 requests)
│   ├── uploads/                 # Uploaded place photos (git-ignored)
│   ├── .env.example             # Environment variable template
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # React Router layout + routes
│   │   ├── api.ts               # Axios API client
│   │   ├── pages/
│   │   │   ├── HomePage.tsx     # Place listing, map, filters
│   │   │   ├── PlaceDetailsPage.tsx
│   │   │   ├── PlanPage.tsx     # Day plan builder
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   └── admin/           # Admin panel pages
│   │   └── components/          # Shared UI components
│   ├── .env.example
│   └── package.json
├── SabaTrail_StarUML.png        # Database ER diagram
├── Database_Setup.md            # Detailed database setup guide
└── README.md
```

---

## Prerequisites

Before you begin, ensure the following are installed:

| Requirement | Version | Notes |
|---|---|---|
| **Node.js** | v20 or later | https://nodejs.org |
| **npm** | v10 or later | Bundled with Node.js |
| **MySQL** or **MariaDB** | MySQL 8.0+ / MariaDB 10.6+ | Running locally on port 3306 |
| **Git** | Any recent version | https://git-scm.com |

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/SabaTrail.git
cd "SabaTrail Project"
```

---

### 2. Database Setup

> See **`Database_Setup.md`** for detailed instructions including GUI tools (MySQL Workbench / phpMyAdmin) and troubleshooting tips.

**Quick setup using MySQL CLI:**

```sql
-- Connect as root
mysql -u root -p

-- Run the following SQL:
CREATE DATABASE sabatrail
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'sabatrail'@'localhost' IDENTIFIED BY 'YourStrongPassword123';

GRANT ALL PRIVILEGES ON sabatrail.* TO 'sabatrail'@'localhost';

FLUSH PRIVILEGES;
EXIT;
```

> ⚠️ If your password contains special characters (e.g. `@`, `#`, `%`), URL-encode them in `DATABASE_URL` — for example `@` becomes `%40`.

---

### 3. Backend Setup

```bash
cd backend

# Copy the environment template and fill in your values
cp .env.example .env
```

Open `backend/.env` and set:
- `DATABASE_URL` — your MySQL connection string
- `JWT_SECRET` — a long random string (see below for how to generate one)
- `SEED_ADMIN_PASSWORD` — initial admin account password
- `SEED_DEMO_PASSWORD` — demo visitor account password

**Generate a JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**Install dependencies and initialise the database:**
```bash
npm install

# Apply all migrations to create the database tables
npx prisma migrate deploy --config prisma7.config.ts

# Generate the Prisma client
npx prisma generate --config prisma7.config.ts

# Seed: inserts 6 categories, 21 places, admin account, and demo visitor
npx prisma db seed --config prisma7.config.ts
```

---

### 4. Frontend Setup

Open a **new terminal** window:

```bash
cd frontend

# Copy the environment template
cp .env.example .env
```

The default `.env` content is:
```
VITE_API_BASE_URL=http://localhost:5000/api
```

This points the frontend to your local backend. Change the URL if your backend runs on a different port.

```bash
npm install
```

---

## Running the Application

Start the **backend** (Terminal 1):
```bash
cd backend
npm run dev
# API server starts at http://localhost:5000
```

Start the **frontend** (Terminal 2):
```bash
cd frontend
npm run dev
# React dev server starts at http://localhost:5173
```

Open `http://localhost:5173` in your browser.

---

## Seed Data & Admin Account

Running `npx prisma db seed --config prisma7.config.ts` is **idempotent** — safe to run multiple times:

- Creates **6 categories**: Religious, Nature/Scenic, Heritage/Cultural, Recreational, Restaurants/Dining, Public/Useful
- Creates or updates **21 real places** within 25 km of Hemmathagama, with:
  - GPS coordinates (from OpenStreetMap / Wikidata)
  - Descriptions (summarised from Wikipedia)
  - Photos (Wikimedia Commons, with credited authors and licenses)
  - Opening hours
- Creates the **admin account** (`SEED_ADMIN_EMAIL`, default `admin@sabatrail.local`) with the password from `SEED_ADMIN_PASSWORD`
- Creates a **demo visitor account** (`SEED_DEMO_EMAIL`) with two sample day plans

> An existing account with the admin email is promoted to admin; its password is never changed.

---

## Testing

### Automated API Tests (27 tests)

```bash
cd backend
npm test
```

Tests run against your configured `DATABASE_URL`. They cover:
- Seed data rules (≥ 10 places within 25 km, 6 categories)
- Registration, login, and JWT authentication
- Validation (Zod schemas)
- Admin-only route enforcement
- In-use delete protection
- Visit plan CRUD (create, add place, reorder, remove, rename, delete)
- CORS and unknown route handling

The test suite starts the app on a random port and cleans up all created data at the end.

### Postman Collection (36 requests)

1. Import `backend/postman/SabaTrail.postman_collection.json` into Postman
2. Set the `adminPassword` collection variable to your `SEED_ADMIN_PASSWORD`
3. Click **Run collection** — requests run end-to-end in order, each checking its expected status code

**To rebuild and run from the command line:**
```bash
cd backend
ADMIN_PASSWORD=your_password node postman/build-collection.mjs --run http://localhost:5000
```

---

## Environment Variables Reference

### `backend/.env`

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | MySQL connection string: `mysql://user:pass@host:port/db` |
| `JWT_SECRET` | ✅ | — | Secret key for signing JWT tokens (min 32 chars recommended) |
| `PORT` | ❌ | `5000` | Port the API server listens on |
| `CORS_ORIGINS` | ❌ | `http://localhost:5173,...` | Comma-separated allowed browser origins |
| `ENABLE_TEST_ROUTES` | ❌ | `false` | Enable `/api/test-db`, `/api/test-auth`, `/api/test-admin` diagnostic routes |
| `SEED_ADMIN_EMAIL` | ❌ | `admin@sabatrail.local` | Email for the seeded admin account |
| `SEED_ADMIN_PASSWORD` | ✅ | — | Password for the seeded admin account |
| `SEED_DEMO_EMAIL` | ❌ | `demo@sabatrail.local` | Email for the seeded demo visitor |
| `SEED_DEMO_PASSWORD` | ✅ | — | Password for the seeded demo visitor |

### `frontend/.env`

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | ✅ | `http://localhost:5000/api` | Base URL for all API requests |

---

## External Services

| Service | Used For | Privacy Note |
|---|---|---|
| **OpenStreetMap** (via Leaflet) | Map tiles for the interactive map | Internet connection required |
| **OSRM** (routing service) | Road distances and driving times | Place coordinates are sent; if visitor uses "Use my location", position is rounded to ~100 m and sent to OSRM — never to the SabaTrail API |
| **Google Maps** | Turn-by-turn directions (opens in a new tab) | Visitor's device location is used directly by Google; SabaTrail never sends it |
| **Wikimedia Commons** | Seeded place photos via URL | External URLs are never modified; credits stored in `image_credit` |

---

## API Endpoints Summary

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | None | Register a new user |
| `POST` | `/api/auth/login` | None | Login, returns JWT |
| `GET` | `/api/categories` | None | List all categories |
| `GET` | `/api/places` | None | List all places |
| `GET` | `/api/places/:id` | None | Get a single place |
| `POST` | `/api/places` | Admin | Create a place |
| `PUT` | `/api/places/:id` | Admin | Update a place |
| `DELETE` | `/api/places/:id` | Admin | Delete a place |
| `GET` | `/api/visit-plans` | User | List own visit plans |
| `POST` | `/api/visit-plans` | User | Create a visit plan |
| `PUT` | `/api/visit-plans/:id` | User | Rename/update a plan |
| `DELETE` | `/api/visit-plans/:id` | User | Delete a plan |
| `POST` | `/api/visit-plans/:id/places` | User | Add a place to a plan |
| `PUT` | `/api/visit-plans/:id/places` | User | Reorder places in a plan |
| `DELETE` | `/api/visit-plans/:id/places/:placeId` | User | Remove a place from a plan |
| `POST` | `/api/uploads/place-image` | Admin | Upload a place photo |

---

## Notes

- **Uploaded photos** are saved under `backend/uploads/` with UUID-based filenames. This directory is git-ignored.
- **Replacing or deleting** a place's uploaded photo removes the old file from disk.
- **Re-seeding** never removes a manually-uploaded photo.
- The **`visit_duration`** field is a legacy free-text field kept in sync with `visit_duration_minutes` for display purposes.
