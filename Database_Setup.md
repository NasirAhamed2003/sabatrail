# SabaTrail — Database Setup Guide

This guide explains how to set up the MySQL / MariaDB database for the SabaTrail project from scratch. It covers GUI tools and command-line methods, plus troubleshooting tips.

---

## Overview

SabaTrail uses **MySQL 8.0+** or **MariaDB 10.6+** with the Prisma ORM (v7). The database contains **5 tables**:

| Table | Description |
|---|---|
| `Users` | Registered users (visitors and administrators) |
| `Categories` | Place categories (e.g. Religious, Nature/Scenic) |
| `Places` | Tourist locations within 25 km of Hemmathagama |
| `Visit_Plans` | Day-trip plans created by users |
| `Visit_Plan_Places` | Junction table linking plans to places (with order) |

See **`SabaTrail_StarUML.png`** for the Entity-Relationship diagram.

---

## Prerequisites

| Software | Minimum Version | Download |
|---|---|---|
| MySQL | 8.0 | https://dev.mysql.com/downloads/mysql/ |
| *or* MariaDB | 10.6 | https://mariadb.org/download/ |
| Node.js | 20 LTS | https://nodejs.org |
| npm | 10 | (bundled with Node.js) |

---

## Step 1 — Create the Database and User

### Option A: MySQL / MariaDB Command Line

```bash
# Connect to MySQL as root
mysql -u root -p
```

Then run:

```sql
-- Create the database with UTF-8 full-Unicode support
CREATE DATABASE sabatrail
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Create a dedicated application user
CREATE USER 'sabatrail'@'localhost' IDENTIFIED BY 'YourStrongPassword123';

-- Grant all privileges on the sabatrail database to that user
GRANT ALL PRIVILEGES ON sabatrail.* TO 'sabatrail'@'localhost';

-- Apply privilege changes immediately
FLUSH PRIVILEGES;

-- Verify
SHOW DATABASES LIKE 'sabatrail';
SELECT User, Host FROM mysql.user WHERE User = 'sabatrail';

EXIT;
```

### Option B: MySQL Workbench (GUI)

1. Open **MySQL Workbench** and connect to your local MySQL instance.
2. In the menu bar select **Database → Create Schema…**
3. Set Name: `sabatrail`, Charset: `utf8mb4`, Collation: `utf8mb4_unicode_ci`, then click **Apply**.
4. Open the **Users and Privileges** panel (Server menu).
5. Click **Add Account**, set:
   - Login Name: `sabatrail`
   - Limit to Hosts Matching: `localhost`
   - Password: (choose a strong password)
6. Go to the **Schema Privileges** tab → **Add Entry** → select `sabatrail` schema → check **ALL**.
7. Click **Apply**.

### Option C: phpMyAdmin (GUI)

1. Log in to phpMyAdmin as `root`.
2. Click **Databases** → enter `sabatrail` → Collation: `utf8mb4_unicode_ci` → **Create**.
3. Click **User accounts** → **Add user account**:
   - User name: `sabatrail`
   - Host name: `localhost`
   - Password: (choose a strong password)
   - Check **Grant all privileges on database "sabatrail"**
4. Click **Go**.

---

## Step 2 — Configure the Backend Environment

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` in a text editor and update `DATABASE_URL`:

```env
DATABASE_URL="mysql://sabatrail:YourStrongPassword123@localhost:3306/sabatrail"
```

**Format:** `mysql://USER:PASSWORD@HOST:PORT/DATABASE`

> ⚠️ **Special characters in passwords** — URL-encode them:
>
> | Character | Encoded |
> |---|---|
> | `@` | `%40` |
> | `#` | `%23` |
> | `%` | `%25` |
> | `+` | `%2B` |
> | `space` | `%20` |
>
> Example: password `p@ss#word` → `p%40ss%23word`

Also set the other required variables:

```env
JWT_SECRET="<generate a random 48-byte hex string — see below>"
SEED_ADMIN_PASSWORD="AdminPassword123"
SEED_DEMO_PASSWORD="DemoPassword123"
```

**Generate a secure JWT secret (run once):**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Step 3 — Apply Migrations (Create Tables)

Prisma migrations create all 5 tables with the correct columns, data types, indexes, and foreign keys.

```bash
cd backend

# Install Node dependencies (if not done yet)
npm install

# Apply all pending migrations to the database
npx prisma migrate deploy --config prisma7.config.ts
```

Expected output:
```
The following migration(s) have been applied:

migrations/
  └─ 20260929193346_init/
     └─ migration.sql
  └─ 20261022120000_text_columns_duration_minutes_constraints/
     └─ migration.sql

All migrations have been successfully applied.
```

### Generate the Prisma Client

```bash
npx prisma generate --config prisma7.config.ts
```

This generates TypeScript types from your schema into `Src/generated/prisma/`.

---

## Step 4 — Seed the Database

The seed script populates the database with real data:

```bash
npx prisma db seed --config prisma7.config.ts
```

This inserts (idempotently — safe to re-run):

- **6 Categories**: Religious, Nature/Scenic, Heritage/Cultural, Recreational, Restaurants/Dining, Public/Useful
- **21 Places** within 25 km of Hemmathagama (GPS coordinates from OpenStreetMap; descriptions from Wikipedia; photos from Wikimedia Commons)
- **Admin account**: email from `SEED_ADMIN_EMAIL` (default `admin@sabatrail.local`), password from `SEED_ADMIN_PASSWORD`
- **Demo visitor**: email from `SEED_DEMO_EMAIL`, with two sample day plans

> If `SEED_ADMIN_PASSWORD` is not set, a random password is generated and printed **once** to the console.

---

## Step 5 — Verify the Setup

### Via the test routes (development only)

Set `ENABLE_TEST_ROUTES=true` in `backend/.env`, start the server (`npm run dev`), and call:

```bash
curl http://localhost:5000/api/test-db
# Expected: {"message":"Database connection successful!"}
```

### Via the automated test suite

```bash
cd backend
npm test
```

27 tests run against your database. All should pass on a clean, seeded database.

### Via Prisma Studio (visual browser)

```bash
cd backend
npx prisma studio --config prisma7.config.ts
```

Opens a browser UI at `http://localhost:5555` where you can inspect all tables and rows.

---

## Database Schema

### Entity-Relationship Overview

```
Categories ──< Places >──── Visit_Plan_Places >── Visit_Plans
                                                        │
                                                      Users
```

### Table Definitions

#### `Users`
| Column | Type | Constraints |
|---|---|---|
| `user_id` | INT | PK, AUTO_INCREMENT |
| `name` | VARCHAR(100) | NOT NULL |
| `email` | VARCHAR(150) | NOT NULL, UNIQUE |
| `password` | VARCHAR(255) | NOT NULL (bcrypt hash) |
| `role` | ENUM('USER','ADMIN') | DEFAULT 'USER' |
| `created_at` | DATETIME | DEFAULT NOW() |

#### `Categories`
| Column | Type | Constraints |
|---|---|---|
| `category_id` | INT | PK, AUTO_INCREMENT |
| `category_name` | VARCHAR(100) | NOT NULL, UNIQUE |
| `description` | TEXT | nullable |

#### `Places`
| Column | Type | Constraints |
|---|---|---|
| `place_id` | INT | PK, AUTO_INCREMENT |
| `category_id` | INT | FK → Categories |
| `place_name` | VARCHAR(255) | NOT NULL |
| `description` | TEXT | nullable |
| `address` | VARCHAR(255) | nullable |
| `latitude` | FLOAT | NOT NULL |
| `longitude` | FLOAT | NOT NULL |
| `distance` | FLOAT | nullable (km from town centre) |
| `opening_time` | VARCHAR(10) | nullable (HH:MM) |
| `closing_time` | VARCHAR(10) | nullable (HH:MM) |
| `best_time_to_visit` | VARCHAR(255) | nullable |
| `visit_duration` | VARCHAR(100) | nullable (legacy free-text) |
| `visit_duration_minutes` | INT | nullable |
| `suitability` | VARCHAR(255) | nullable |
| `travel_tips` | TEXT | nullable |
| `facilities` | TEXT | nullable |
| `before_you_go` | TEXT | nullable |
| `image` | TEXT | nullable (URL or `/uploads/` path) |
| `image_credit` | VARCHAR(500) | nullable |
| `created_at` | DATETIME | DEFAULT NOW() |
| `updated_at` | DATETIME | AUTO-updated |

#### `Visit_Plans`
| Column | Type | Constraints |
|---|---|---|
| `plan_id` | INT | PK, AUTO_INCREMENT |
| `user_id` | INT | FK → Users |
| `plan_name` | VARCHAR(255) | NOT NULL |
| `visit_date` | DATETIME | NOT NULL |
| `created_at` | DATETIME | DEFAULT NOW() |

#### `Visit_Plan_Places`
| Column | Type | Constraints |
|---|---|---|
| `plan_place_id` | INT | PK, AUTO_INCREMENT |
| `plan_id` | INT | FK → Visit_Plans |
| `place_id` | INT | FK → Places |
| `visit_order` | INT | NOT NULL |
| `planned_time` | VARCHAR(10) | nullable |
| — | UNIQUE | (`plan_id`, `place_id`) |

---

## Migration History

| Migration | Date | Description |
|---|---|---|
| `20260929193346_init` | 2026-09-29 | Initial schema: all 5 tables |
| `20261022120000_text_columns_duration_minutes_constraints` | 2026-10-22 | Added TEXT columns, `visit_duration_minutes`, and column constraints |

---

## Troubleshooting

### `Access denied for user 'sabatrail'@'localhost'`
- Check the username, password, and host in `DATABASE_URL`.
- Verify the user exists: `SELECT User, Host FROM mysql.user;`
- Re-run `GRANT ALL PRIVILEGES ON sabatrail.* TO 'sabatrail'@'localhost'; FLUSH PRIVILEGES;`

### `Unknown database 'sabatrail'`
- The database was not created. Run the `CREATE DATABASE` command in Step 1.

### `P3005: The database schema is not empty` (Prisma)
- This happens if you run `migrate dev` instead of `migrate deploy` on an existing database.
- Use `npx prisma migrate deploy --config prisma7.config.ts`.

### Special characters in password not working
- URL-encode them (see the table in Step 2).

### Port 3306 already in use
- Another MySQL/MariaDB instance may be running. Check with `netstat -ano | findstr 3306` (Windows) or `lsof -i :3306` (Mac/Linux) and stop the conflicting service.

### `Error: connect ECONNREFUSED 127.0.0.1:3306`
- MySQL/MariaDB service is not running.
- Windows: `net start MySQL80` (or open Services and start the MySQL service)
- macOS: `brew services start mysql`
- Linux: `sudo systemctl start mysql`

---

## Resetting the Database (Development)

To wipe and recreate from scratch (⚠️ **destroys all data**):

```bash
cd backend

# Drop and recreate the database
mysql -u root -p -e "DROP DATABASE IF EXISTS sabatrail; CREATE DATABASE sabatrail CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Re-apply all migrations
npx prisma migrate deploy --config prisma7.config.ts

# Regenerate the client
npx prisma generate --config prisma7.config.ts

# Re-seed
npx prisma db seed --config prisma7.config.ts
```
