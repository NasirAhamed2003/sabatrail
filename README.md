# SabaTrail

One-day visit planner for Hemmathagama, Sri Lanka, and the area within 25 km.

- **frontend/**: React + Vite + TypeScript, Leaflet / OpenStreetMap
- **backend/**: Node.js + Express + TypeScript REST API, Prisma ORM, MySQL/MariaDB, JWT auth

## Setup

### 1. Database

Create an empty database and a user that can manage it, for example:

```sql
CREATE DATABASE sabatrail CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'sabatrail'@'localhost' IDENTIFIED BY 'choose-a-password';
GRANT ALL PRIVILEGES ON sabatrail.* TO 'sabatrail'@'localhost';
```

### 2. Backend

```bash
cd backend
cp .env.example .env          # then fill in DATABASE_URL, JWT_SECRET, SEED_ADMIN_PASSWORD
npm install
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
npx prisma db seed --config prisma7.config.ts
npm run dev                   # http://localhost:5000
```

If the database password contains special characters, URL-encode them in `DATABASE_URL` (for example `@` becomes `%40`).

### 3. Frontend

```bash
cd frontend
cp .env.example .env          # VITE_API_BASE_URL=http://localhost:5000/api
npm install
npm run dev                   # http://localhost:5173
```

## Seed data and the admin account

`npx prisma db seed --config prisma7.config.ts` is safe to run repeatedly. It:

- creates the six categories: Religious, Nature/Scenic, Heritage/Cultural, Recreational, Restaurants/Dining, Public/Useful;
- creates or updates 21 real places within 25 km of Hemmathagama town centre;
- creates the administrator account.

Place sources:

- **Coordinates:** OpenStreetMap and Wikidata.
- **Descriptions:** summarised from Wikipedia.
- **Photos:** Wikimedia Commons, with the author and licence stored in `image_credit`.
- **Opening hours:** only set where widely published. Verify them before relying on them.

Registration always creates regular users, so the seed is how the first administrator is created:

- **Email:** `SEED_ADMIN_EMAIL` (default `admin@sabatrail.local`)
- **Password:** `SEED_ADMIN_PASSWORD` from `backend/.env`. If it's unset, a random password is generated and printed once.

An existing account with that email is promoted to admin. Its password is never changed.

## Testing

### API tests

```bash
cd backend
npm test
```

27 tests run against the database in `DATABASE_URL`, using Node's built-in test runner through `tsx`. They cover:

- the seed data rules: at least 10 places within 25 km, and the six categories;
- authentication and validation;
- admin-only access and the in-use delete rules;
- visit-plan create, add, reorder, remove, rename and delete;
- CORS and unknown routes.

The tests start the app on a random port, and everything they create is deleted at the end.

### Postman

1. Import `backend/postman/SabaTrail.postman_collection.json`.
2. Set the `adminPassword` collection variable.
3. Use **Run collection**.

The 36 requests run end to end in order, and each checks its expected status code. To regenerate the collection, or to replay it from the command line against a running API:

```bash
cd backend
ADMIN_PASSWORD=... node postman/build-collection.mjs --run http://localhost:5000
```

## Notes on external services

- **Maps:** OpenStreetMap tiles through Leaflet. These need an internet connection.
- **Directions:** links open Google Maps. Without an origin, Google uses the device's own location, so the visitor's position never passes through SabaTrail.
- **Driving-time estimates:** come from the public OSRM routing service (OpenStreetMap road data). Only place and town-centre coordinates are sent. If the service can't be reached, the planner shows "Travel time unavailable" instead of guessing.
- **Photos:** Wikimedia Commons URLs, with credits shown on each place page.
