# SabaTrail: Requirements Verification Audit

**Audited against:** *SabaTrail Final SRS v1.1* (5 September 2026) and the project proposal.
**Code audited:** branch `redesign/remediation` at commit `1e73e34` (22 October 2026).
**Method:**
- Read each requirement in the SRS PDF.
- Opened the code that implements it and recorded the file and line.
- Checked behaviour with 32 API tests, a 36-request Postman collection, and browser checks at 1920, 1440, 1366, 768 and 375 px.

Paths are relative to the repository root. `FE` is `frontend/src`, `BE` is `backend/Src`.

**Status key:**
- ✅ Fully implemented
- 🟡 Partly implemented
- ❌ Missing
- ⚠️ Implemented differently from the SRS

---

## 1. Executive summary

| Area | ✅ | 🟡 | ❌ | ⚠️ | Fully satisfied |
|---|---|---|---|---|---|
| Functional requirements (FR-001 to FR-059) | 56 | 2 | 0 | 1 | **95% (56 of 59)** |
| Non-functional requirements (21) | 19 | 2 | 0 | 0 | **90% (19 of 21)** |
| Business rules (BR-01 to BR-07) | 6 | 1 | 0 | 0 | 86% |
| Database rules (DB-01 to DB-06) | 6 | 0 | 0 | 0 | 100% |

Every high-priority feature area works end to end: browse, search and filter, place details, map, auth, planner, summary, and admin.

**Main gaps:**
1. **FR-033: empty plans are allowed.**
   - Plans can be created with no places, through "Create an empty plan" (`FE/pages/PlanPage.tsx:491`) and `POST /api/visit-plans`.
   - The SRS says to prevent a plan with no places and show a validation message.
2. **The backend's folder-name casing would break on Linux.**
   - The folder is named `Src`, but `backend/package.json:7` runs `src/server.ts` and `backend/prisma/schema.prisma:3` writes to `../src/generated`.
   - This works on Windows only. It would break on the Linux hosting the SRS proposes (Render or Railway).
3. **FR-040: no total distance in the summary.**
   - Distance per leg is shown in the timeline.
   - The "Your day at a glance" summary shows no total, even though it's already calculated (`FE/lib/trip.ts:34`).
4. **FR-021 / NFR-PERF-05: map-tile failures aren't reported.**
   - If the map tiles fail to load, the visitor sees grey tiles with no message.
   - Route failures, by contrast, show "Travel time unavailable".
5. **Parts of the stated technology stack weren't adopted:**
   - Tailwind CSS
   - Cloudinary
   - Swagger/OpenAPI
   - Docker
   - GitHub Actions
   - The proposed hosting

   See §4.

---

## 2. Architecture as built

### 2.1 Frontend routes (`FE/App.tsx:17-57`)

| Route | Page | Access |
|---|---|---|
| `/` | Home: hero, Explore (search, category chips, catalogue, day rail), How it works | Public |
| `/places/:id` | Place details | Public |
| `/login`, `/register` | Login and registration | Public |
| `/plan`, `/plan/:planId` | One-day planner and plan summary | Logged in (`RequireAuth`) |
| `/admin/places`, `/admin/places/new`, `/admin/places/:id/edit` | Manage places | Admin (`RequireAdmin`) |
| `/admin/categories` | Manage categories | Admin |
| `*` | 404 | Public |

### 2.2 API endpoints

| Method and path | Auth | Source |
|---|---|---|
| `POST /api/auth/register`, `POST /api/auth/login` | none | `BE/routes/authRoutes.ts:13,16` |
| `GET /api/auth/me` | JWT | `authRoutes.ts:19` |
| `GET /api/categories`, `GET /api/categories/:id` | none | `categoryRoutes.ts:15-16` |
| `POST`, `PUT`, `DELETE /api/categories[/:id]` | JWT + admin | `categoryRoutes.ts:19-21` |
| `GET /api/places`, `GET /api/places/:id` | none | `placeRoutes.ts:16-17` |
| `GET /api/places/:id/usage` | JWT + admin | `placeRoutes.ts:20` |
| `POST`, `PUT`, `DELETE /api/places[/:id]` (`?force=true`) | JWT + admin | `placeRoutes.ts:21-23` |
| `POST /api/uploads` (multipart `image`) | JWT + admin | `uploadRoutes.ts:9` |
| `GET /uploads/<file>` (static) | none | `BE/app.ts:43-55` |
| `GET`, `POST /api/visit-plans`; `GET`, `PUT`, `DELETE /api/visit-plans/:id` | JWT (owner only) | `visitPlanRoutes.ts:14-26` |
| `GET`, `POST /api/visit-plans/:planId/places`; `PUT /:planId/order`; `PUT`, `DELETE /:planId/places/:placeId` | JWT (owner only) | `visitPlanPlaceRoutes.ts:17-50` |
| `GET /api/test-db`, `/api/test-auth`, `/api/test-admin` | Only when `ENABLE_TEST_ROUTES=true` outside production | `BE/app.ts:87-126`, `BE/config.ts:32` |

### 2.3 Data model (`backend/prisma/schema.prisma`)

The five tables are `Users`, `Categories`, `Places`, `Visit_Plans` and `Visit_Plan_Places`. §5 compares them with the SRS.

### 2.4 Integrations in use

| Integration | Where |
|---|---|
| React Leaflet with OpenStreetMap tiles | `FE/components/PlaceMap.tsx:70-92`, `FE/components/LocationPicker.tsx:23` |
| Google Maps directions links | `FE/lib/geo.ts:30-48` |
| OSRM public routing service (road distance and driving time) | `FE/lib/travel.ts:10-11` |
| Browser geolocation | `FE/lib/startPoint.tsx:73` |
| bcryptjs | `BE/controllers/authController.ts:52,102` |
| jsonwebtoken | `authController.ts:111`, `BE/middleware/authMiddleware.ts:36` |
| zod validation | `BE/validation.ts` |
| multer (image upload) | `BE/controllers/uploadController.ts` |
| Wikimedia Commons image URLs | `backend/prisma/seed.ts:25` |
| Prisma 7 on MariaDB 12.2 | `BE/prisma.ts` |

---

## 3. Requirement-by-requirement verification

### 3.1 Place discovery and browsing

| ID | Requirement | Status | Evidence | Notes |
|---|---|---|---|---|
| FR-001 | At least 10 places within 25 km | ✅ | `backend/prisma/seed.ts` (21 places); test `backend/tests/api.test.ts:101-106` | 21 places, all ≤ 25 km by Haversine from the town centre |
| FR-002 | Name, category, summary on each place | ✅ | `FE/components/PlaceCard.tsx:35,37-38,41` | Distance, visit time and hours are also shown |
| FR-003 | Six proposal categories | ✅ | `seed.ts:15-22`; test `api.test.ts:110` | Religious, Nature/Scenic, Heritage/Cultural, Recreational, Restaurants/Dining, Public/Useful |
| FR-004 | Open a place's details | ✅ | `PlaceCard.tsx:26,38,68`, route `FE/App.tsx:20` | |
| FR-005 | Catalogue usable on desktop and mobile | ✅ | `FE/components/PlaceCard.css` (auto-fill grid), `FE/pages/HomePage.css` | Checked at 1920 to 375 px with no overflow |

### 3.2 Search and category filtering

| ID | Requirement | Status | Evidence | Notes |
|---|---|---|---|---|
| FR-006 | Search by name or keyword | ✅ | `FE/pages/HomePage.tsx:35-52,132-136` | Matches name, description, category and address |
| FR-007 | Filter by category | ✅ | `HomePage.tsx:38-40,141-147` | Chips use `aria-pressed` |
| FR-008 | Search and filter together | ✅ | `HomePage.tsx:37-56` | Both conditions are applied together |
| FR-009 | Clear empty-result message | ✅ | `HomePage.tsx:189-205` | "No matching destinations found", with a "Clear filters" action |

### 3.3 Place details and visit guidance

| ID | Requirement | Status | Evidence | Notes |
|---|---|---|---|---|
| FR-010 | Name, category, description, address, distance, hours, best time, duration | ✅ | `FE/pages/PlaceDetailsPage.tsx:169-186,201` | Distance is by road (OSRM) with a straight-line fallback |
| FR-011 | Travel tips, facilities, images | ✅ | `PlaceDetailsPage.tsx:153-162,232-242` | Photo credit shown |
| FR-012 | Map location | ✅ | `PlaceDetailsPage.tsx:249-258` | |
| FR-013 | Suitability information | ✅ | `PlaceDetailsPage.tsx:135,219-226` | Shown as "Good for" tags |
| FR-014 | Before You Go | ✅ | `PlaceDetailsPage.tsx:134,207-217`; field `schema.prisma:56` | Clothing, footwear, carry and safety lines |
| FR-015 | Admin-maintained data is the source | ✅ | `FE/lib/places.ts` reads `GET /api/places` | No hard-coded place data in the UI |

### 3.4 Interactive map and route guidance

| ID | Requirement | Status | Evidence | Notes |
|---|---|---|---|---|
| FR-016 | React Leaflet with OpenStreetMap | ✅ | `FE/components/PlaceMap.tsx:3,70-80` | |
| FR-017 | Markers from stored latitude and longitude | ✅ | `PlaceMap.tsx:92`; `PlaceDetailsPage.tsx:140` | |
| FR-018 | Route from the user's location or a chosen start point | ✅ | `FE/lib/geo.ts:30-48`; `FE/lib/startPoint.tsx:73`; `FE/pages/PlanPage.tsx:657` | Start is the town centre or "Use my location" |
| FR-019 | Google Maps Directions API or link | ✅ | `geo.ts:34,48`; `PlaceDetailsPage.tsx:177` | Uses the link form, which the SRS allows |
| FR-020 | Haversine distance | ✅ | `BE/geo.ts:9-31`; `FE/lib/geo.ts:12` | Stored distance and the nearby/food lists use Haversine |
| FR-021 | Map and route failures don't block place information | 🟡 | `FE/lib/travel.ts:35-53,104-125`; `FE/components/TripSummary.tsx:22-26` | Route failure shows "Travel time unavailable" and falls back to straight-line distance. Place information stays visible. A tile failure shows grey tiles with no message. |

### 3.5 Registration and authentication

| ID | Requirement | Status | Evidence | Notes |
|---|---|---|---|---|
| FR-022 | Secure admin login | ✅ | `FE/pages/LoginPage.tsx`; `FE/components/RouteGuards.tsx:19-24`; `BE/middleware/adminMiddleware.ts` | One login form for all roles; role decides access |
| FR-023 | User registration | ✅ | `FE/pages/RegisterPage.tsx`; `authController.ts:52-62` | Self-registration always creates a `USER` |
| FR-024 | Login for users and admins | ✅ | `authController.ts:96-123` | |
| FR-025 | bcrypt password hashing | ✅ | `authController.ts:52,102` | Cost 10 |
| FR-026 | JWT for protected functions | ✅ | `authController.ts:111-120`; `authMiddleware.ts:12-52` | Expires after 1 day |
| FR-027 | Admin functions need the admin role | ✅ | `adminMiddleware.ts`; every admin route in §2.2 | 401 or 403 tested |
| FR-028 | Clear invalid-credentials error | ✅ | `authController.ts:96-106`; `LoginPage.tsx:45,80` | "Invalid email or password" (generic) |

### 3.6 One-day visit planner

| ID | Requirement | Status | Evidence | Notes |
|---|---|---|---|---|
| FR-029 | Select multiple places | ✅ | `FE/components/AddToDayButton.tsx:34`; `FE/lib/plans.tsx:179`; `PlanPage.tsx:365` | |
| FR-030 | Use visit-duration information | ✅ | `FE/lib/trip.ts:27`; field `schema.prisma:52` | |
| FR-031 | Keep the planned visit order | ✅ | `BE/controllers/visitPlanPlaceController.ts:76-92,213-229,368-372`; `PlanPage.tsx:291-309` | Stops can be reordered, and orders are renumbered after a removal |
| FR-032 | Add more places to an existing plan | ✅ | `visitPlanPlaceController.ts:21-104`; `PlanPage.tsx:365` | |
| FR-033 | Prevent a plan with no places, with a validation message | ⚠️ | `PlanPage.tsx:479-491`; `BE/validation.ts:139-142` | Empty plans can be created on purpose and show "No stops yet" guidance (`PlanPage.tsx:599-601`). This is a deliberate deviation: "Add to my day" creates the plan together with its first stop. |

### 3.7 Nearby places and food stops

| ID | Requirement | Status | Evidence | Notes |
|---|---|---|---|---|
| FR-034 | Nearby suggestions | ✅ | `PlaceDetailsPage.tsx:22,92-110,263-268` | Within 8 km |
| FR-035 | Natural, cultural, religious or dining places in suggestions | ✅ | `PlaceDetailsPage.tsx:263-275` | Non-food places within 8 km, plus food stops within 15 km |
| FR-036 | Restaurants and dining as food stops | ✅ | `FE/components/FoodStops.tsx:10-27`; `PlaceDetailsPage.tsx:23,270-275` | Also shown for the planner (`PlanPage.tsx:668`) |
| FR-037 | Based on admin data | ✅ | Same; reads the catalogue from the API | |

### 3.8 Plan summary

| ID | Requirement | Status | Evidence | Notes |
|---|---|---|---|---|
| FR-038 | Show the selected places | ✅ | `PlanPage.tsx:609-625` (timeline) | |
| FR-039 | Show the visit order | ✅ | Numbered timeline and route-map markers, `PlanPage.tsx:509-519,663` | |
| FR-040 | Approximate distance | 🟡 | Per leg: `PlanPage.tsx:133` | No total distance in "Your day at a glance" (`TripSummary.tsx:43-60`). `travelKm` is calculated in `trip.ts:34` but not displayed. |
| FR-041 | Estimated travel time | ✅ | `TripSummary.tsx:53-55`; `trip.ts:33` | OSRM, with "Travel time unavailable" if it can't be reached |
| FR-042 | Estimated visit duration | ✅ | `TripSummary.tsx:49-50`; `trip.ts:27` | Warns when some stops have no duration |
| FR-043 | Total journey time | ✅ | `TripSummary.tsx:57-58`; `trip.ts:44` | |
| FR-044 | Values labelled as estimates; traffic can change them | ✅ | `TripSummary.tsx:104-110` | Also on the place page (`PlaceDetailsPage.tsx:190`) |
| FR-045 | Save plans permanently and access them later | ✅ | `Visit_Plans` and `Visit_Plan_Places`; `BE/controllers/visitPlanController.ts` | Plans are private to their owner (tested) |

The SRS travel-time fallback rule is met: `TripSummary.tsx:22-26` shows "Travel time unavailable" rather than a guess.

### 3.9 Admin place management

| ID | Requirement | Status | Evidence | Notes |
|---|---|---|---|---|
| FR-046 | Add a place | ✅ | `BE/controllers/placeController.ts:65-95`; `FE/pages/admin/PlaceFormPage.tsx` | |
| FR-047 | Edit a place | ✅ | `placeController.ts:97-142` | |
| FR-048 | Delete a place | ✅ | `placeController.ts:169-210`; `FE/pages/admin/AdminPlacesPage.tsx:95-108` | Warns when the place is in visitor plans (409, then `?force=true`) |
| FR-049 | Update descriptions, times, images, tips | ✅ | `PlaceFormPage.tsx:274-430` | Images can be uploaded or pasted as a URL |
| FR-050 | All listed place fields | ✅ | Form sections Basics, Location, Visiting, Guidance and Photo, `PlaceFormPage.tsx:274,305,342,375,408` | Location can be picked by clicking the map |
| FR-051 | Stored in MySQL through Prisma | ✅ | `placeController.ts`; `BE/prisma.ts` | MariaDB, which is MySQL-compatible (see §4) |
| FR-052 | Validate before create or update | ✅ | `BE/validation.ts:87-128`; client checks `PlaceFormPage.tsx:65-94` | |
| FR-053 | Block non-admins | ✅ | `placeRoutes.ts:20-23`; `RouteGuards.tsx:19-24` | |

### 3.10 Admin category management

| ID | Requirement | Status | Evidence | Notes |
|---|---|---|---|---|
| FR-054 | View categories | ✅ | `FE/pages/admin/AdminCategoriesPage.tsx`; `BE/controllers/categoryController.ts:21-38` | Includes the number of places in each category |
| FR-055 | Add a category | ✅ | `AdminCategoriesPage.tsx:192`; `categoryController.ts:65` | Duplicate names refused (unique index) |
| FR-056 | Edit a category | ✅ | `AdminCategoriesPage.tsx:33-58,132`; `categoryController.ts:82` | |
| FR-057 | Remove a category only if unused | ✅ | `categoryController.ts:105-127`; `AdminCategoriesPage.tsx:211,313-318` | 409 with a count of the places using it |
| FR-058 | Stored in the Categories table | ✅ | `schema.prisma:28-36` | |
| FR-059 | Block non-admins | ✅ | `categoryRoutes.ts:19-21` | |

### 3.11 Non-functional requirements

| ID | Status | Evidence | Notes |
|---|---|---|---|
| PERF-01 Responsive UI | ✅ | Client-side catalogue (`FE/lib/places.ts`, cached once per load) | |
| PERF-02 Search and filter under 2 s | ✅ | `HomePage.tsx:35-56` (in memory) | Measured at 0.006 ms per keystroke with 21 places |
| PERF-03 Planner update under 2 s | ✅ | Reorder is one request (`PlanPage.tsx:309`) | Median 4.3 ms locally |
| PERF-04 Desktop, tablet and mobile layouts | ✅ | `FE/styles/tokens.css` (container steps); 22 `@media` blocks | Checked at 1920, 1536, 1366, 1280, 1100, 1024, 768, 414 and 375 |
| PERF-05 Tell external-service failures apart from local data failures | 🟡 | API failure: `HomePage.tsx` "Unable to load destinations". Route failure: "Travel time unavailable". Image failure: placeholder (`PlaceCard.tsx:26-32`) | Map-tile failure has no message |
| SAFE-01 Estimates, not guarantees | ✅ | `TripSummary.tsx:104-110`; `PlaceDetailsPage.tsx:190` | |
| SAFE-02 Safety, clothing and footwear shown | ✅ | `PlaceDetailsPage.tsx:207-217` | |
| SAFE-03 Not a transport, emergency or ticketing service | ✅ | `HomePage.tsx:256-258` | Includes emergency numbers 1990 and 119 |
| SAFE-04 Traffic changes travel time | ✅ | `TripSummary.tsx:107-109` | |
| SEC-01 bcrypt | ✅ | `authController.ts:52` | |
| SEC-02 JWT | ✅ | `authMiddleware.ts:36`; `BE/config.ts:13-22` | Production refuses to start without `JWT_SECRET` |
| SEC-03 Admin role required | ✅ | `adminMiddleware.ts`; API tests | |
| SEC-04 Server-side validation | ✅ | `BE/validation.ts`; `BE/http.ts:11-35`; `BE/app.ts:38` (100 kb JSON limit) | Uploads are checked by file content |
| SEC-05 No credential leakage in errors | ✅ | `BE/http.ts:39-62`; generic login error at `authController.ts:96-106` | Raw errors are logged on the server, never returned |
| SEC-06 HTTPS in production | 🟡 | `FE/api.ts` (env-based API URL); CORS allowlist `BE/app.ts:30-35` | TLS is a hosting step; not deployed. The SRS itself lists this as TBD. |
| QUAL-01 Usability | ✅ | Shared UI kit `FE/components/ui/*`; plain-language labels | |
| QUAL-02 Responsiveness | ✅ | As PERF-04 | |
| QUAL-03 Maintainability | ✅ | Routes, controllers and validation separated (`BE/*`); pages, components and lib modules (`FE/*`) | See the casing risk in §4 |
| QUAL-04 Reliability | ✅ | Optional fields render only when present (`PlaceDetailsPage.tsx:161-242`); external failures never write data | |
| QUAL-05 Testability through Postman | ✅ | `backend/postman/SabaTrail.postman_collection.json` (36 requests); `backend/tests/api.test.ts` (32 tests) | The upload endpoint isn't in the Postman collection yet |
| QUAL-06 Consistent navigation, forms and messages | ✅ | `FE/components/ui/Field.tsx`, `Alert.tsx`, `Toast.tsx`, `Button.tsx`; `FE/styles/tokens.css` | |

### 3.12 Business rules

| ID | Status | Evidence | Notes |
|---|---|---|---|
| BR-01 At least 10 places within 25 km of the home location | ✅ | `BE/geo.ts:5-6` (town centre, OSM node 1831898259); test `api.test.ts:101-106` | |
| BR-02 Place details verified | 🟡 | Sources documented in `seed.ts:1-13` and the README | Coordinates come from OSM and Wikidata. Opening hours are set only where published. No field-level check has been recorded. |
| BR-03 Only admins edit place data | ✅ | `placeRoutes.ts:20-23` | |
| BR-04 Visitor flow: browse, search, filter, view, map, plan | ✅ | §3.1 to §3.8 | Browsing doesn't need an account; saving a plan does |
| BR-05 No booking, payment or reservations | ✅ | No such code; scope notice at `HomePage.tsx:256` | |
| BR-06 Map and route need internet | ✅ | README "Notes on external services"; OSRM fallback | No in-app offline notice (same gap as FR-021) |
| BR-07 Travel time varies | ✅ | `TripSummary.tsx:107-109` | |

---

## 4. Deviations from the SRS

| Item | SRS | As built | Impact |
|---|---|---|---|
| Styling | Tailwind CSS (§3.3, Fig. 3) | Plain CSS with design tokens (`FE/styles/tokens.css`) and per-component CSS | None functionally. Update the SRS or note it in the report. |
| Image management | Cloudinary (§3.3, §6.2) | Local upload to `backend/uploads/` (`BE/uploads.ts`, `POST /api/uploads`), or external image URLs | Works locally. Uploads are on the server's disk, so a hosted deployment needs persistent storage or a swap to Cloudinary. |
| Route guidance | Google Maps Directions API or link | Google Maps links only. Travel times and road distances come from OSRM, which the SRS doesn't mention. | Allowed by "API/Link". OSRM is a public demo server; production should use a hosted routing service. |
| Database engine | MySQL | MariaDB 12.2, Prisma `mysql` provider | MySQL-compatible; no code impact |
| API documentation | Swagger / OpenAPI (§6.2) | Not present; Postman collection and README instead | Missing |
| Containers and CI/CD | Docker, GitHub Actions (§6.2) | Not present | Missing |
| Hosting | Vercel + Render/Railway, Neon/Supabase (§6.2) | Not deployed | Listed as TBD in the SRS |
| Pages (§3.1) | Separate Categories, Map, About and Search pages; an admin Dashboard | Categories and Search are part of Explore on the home page. About is "How it works". Maps appear on place pages and the planner. `/admin` opens Manage Places, which shows summary counts. | There is **no map of all places together**, and no "Map" link in the navigation, which §3.1 asks for. |
| Table names | "Visit Plans", "Visit Plan Places" | `Visit_Plans`, `Visit_Plan_Places` (`schema.prisma:78,92`) | Naming only; SQL-safe |
| `Places.visit_duration` | One field | Kept as display text, plus `visit_duration_minutes` (integer) for calculations (`schema.prisma:50-52`) | Additive |
| `Users.role` | Text field | `Role` enum `USER`/`ADMIN` (`schema.prisma:10-13,20`) | Stricter |
| Folder-name casing | n/a | Folder is `backend/Src`, but `package.json:7` runs `src/server.ts` and Prisma writes to `../src/generated` (`schema.prisma:3`) | **Breaks on Linux**, where file names are case-sensitive. That matters for the proposed hosting. |
| FR-033 | No plan without places | Empty plans allowed | See §3.6 |

---

## 5. Database model check (DB-01 to DB-06)

| Table | SRS fields | In schema | Extra fields | Keys and relations |
|---|---|---|---|---|
| Users | user_id, name, email, password, role, created_at | All (`schema.prisma:15-26`) | — | PK `user_id`; unique `email` |
| Categories | category_id, category_name, description | All (`:28-36`) | — | PK `category_id`; unique `category_name` (added) |
| Places | place_id, category_id, place_name, description, address, latitude, longitude, distance, opening_time, closing_time, best_time_to_visit, visit_duration, suitability, travel_tips, facilities, image, created_at, updated_at | All (`:38-66`) | `visit_duration_minutes`, `before_you_go`, `image_credit` | PK `place_id`; FK `category_id` → Categories |
| Visit Plans | plan_id, user_id, plan_name, visit_date, created_at | All (`:68-79`) | — | PK `plan_id`; FK `user_id` → Users |
| Visit Plan Places | plan_place_id, plan_id, place_id, visit_order, planned_time | All (`:81-93`) | — | PK `plan_place_id`; FKs to Visit_Plans and Places; unique (`plan_id`, `place_id`) (added) |

**Rules:**

| Rule | Status | Evidence |
|---|---|---|
| DB-01 Every table has a primary key | ✅ | `20260929193346_init/migration.sql:11,20,44,55,66` |
| DB-02 Places → category | ✅ | FK at `migration.sql:70` |
| DB-03 Plans → user | ✅ | FK at `:73` |
| DB-04 Plan places → valid plan and place | ✅ | FKs at `:76,79` |
| DB-05 Relationships match the proposal | ✅ | One user has many plans, one plan has many plan-places, one place appears in many plan-places, one category has many places |
| DB-06 Latest stored values are used | ✅ | Places are read live from the API; the admin cache is cleared on save (`FE/lib/places.ts`) |

All foreign keys are `ON DELETE RESTRICT`. Deletes are handled in the application: categories in use are refused, and places in plans are deleted only with an explicit confirmation, inside a transaction.

---

## 6. Features not in the documents

None of these involves booking, payments or reservations, so none conflicts with BR-05.

| Feature | Where |
|---|---|
| Rename, re-date and delete plans | `PUT`/`DELETE /api/visit-plans/:id`; `FE/components/PlanFormDialog.tsx` |
| Reorder stops in one request; undo after removing a stop | `PUT /:planId/order`; `PlanPage.tsx:291-341` |
| Planned arrival time per stop, editable | `planned_time` (the SRS lists the field but not the editing); `PlanPage.tsx:360` |
| "Your day" bottom bar and side panel showing the active plan | `FE/components/DayTray.tsx` |
| "Use my location" start point, remembered for the browser session; a warning when the location is only approximate | `FE/lib/startPoint.tsx`, `FE/components/StartPointControl.tsx` |
| Road distance and driving time from OSRM, a service the SRS doesn't name | `FE/lib/travel.ts` |
| Whole-day route in Google Maps | `FE/lib/geo.ts:38-48`; `TripSummary.tsx` |
| Admin: place usage count before delete, and force-delete | `GET /api/places/:id/usage`; `placeController.ts:145-210` |
| Admin: search, filter and sort the place list; count of places without photos | `AdminPlacesPage.tsx:26-85,71,136` |
| Admin: pick the location by clicking a map | `FE/components/LocationPicker.tsx:23-24` |
| Admin: local image upload with preview, plus a photo-credit field | `POST /api/uploads`, `/uploads` static; `FE/components/ImageUploadField.tsx`; `image_credit` |
| Current-user endpoint and account menu | `GET /api/auth/me`; `FE/components/AccountMenu.tsx` |
| Password strength rules (8+ characters, a letter and a number) | `BE/validation.ts:59-64`; `RegisterPage.tsx:25-28` |
| Emergency numbers and a scope notice | `HomePage.tsx:256-258` |
| Diagnostic routes, off unless enabled | `BE/app.ts:87-126` |
| Seed script with real places, an admin account and a demo user | `backend/prisma/seed.ts` |
| Automated API tests and a Postman collection builder | `backend/tests/api.test.ts`; `backend/postman/build-collection.mjs` |
| Site logo component and hero photo | `FE/components/Logo.tsx`; `FE/assets/hero-*.webp` |

**SRS §6.3 optional features:**

| Optional feature | Built? |
|---|---|
| Profile editing and password management | Not built. Profile is read-only through `/auth/me`. |
| Sharing or exporting a plan | Partly: "Open the whole day in Google Maps" exports the route |
| Admin dashboard statistics | Minimal: place count and photos missing (`AdminPlacesPage.tsx:131-137`) |
| Ratings and reviews | Not built |
| Extra place fields (parking, toilets, fees and so on) | Not built as separate fields. The free-text `facilities` field covers them. |
| Weather | Not built |
| Extra languages | Not built (English only) |

---

## 7. Appendix C (TBD list): what the build settled

| TBD item | What the build does |
|---|---|
| 1. Home-location coordinate and distances | Hemmathagama town centre (OSM node 1831898259, `BE/geo.ts:5-6`). Distances are calculated, not typed in. |
| 2. Verified hours and facilities | Hours set only where published (`seed.ts:11`). Still needs a field check (BR-02). |
| 3. Browser and runtime versions | Node 22, current Chrome. Not formally documented. |
| 4. Performance thresholds | Measured locally (§3.11). |
| 5. API endpoints and contracts | §2.2 and the Postman collection. No OpenAPI specification. |
| 6–7. Deployment and database hosting | Not decided. Runs locally on MariaDB 12.2. |
| 8. Cloudinary configuration | Not used; local uploads instead. |
| 9. Visual design | Design tokens and components (`UIUX_AUDIT.md`, `FE/styles/tokens.css`). |
| 10. Registration needed to save plans? | **Yes.** Saving and opening plans requires login (`RequireAuth`, JWT on `/api/visit-plans`). Browsing doesn't. |
| 11. Ratings, reviews, extra facility fields | Not built. |
| 12. Languages | English only. |
| 13–15. Uptime, backups, concurrency | Not addressed. |
| 16. Accessibility target | Not formally chosen. In practice: labelled controls, focus styles, 44 px touch targets, `aria-live` status messages and reduced-motion support. |
| 17. Weather | Not built. |
| 18. Optional features | See §6. |

---

## 8. Prioritised fix list

**High**
1. **Fix the `Src` / `src` casing** before deploying to Linux. Rename the folder to `src`, or point `package.json:7` and `schema.prisma:3` at `Src`.
2. **FR-033: decide and record the empty-plan rule.** Either block plans with no places (API validation plus a message), or record the deviation in the SRS or report. The current behaviour is intentional but doesn't match the SRS wording.

**Medium**
3. **FR-040:** show the total distance in "Your day at a glance" (`TripSummary.tsx`). The value already exists (`trip.ts:34`).
4. **FR-021 / PERF-05 / BR-06:** add a `tileerror` handler to `PlaceMap.tsx` that shows "Map tiles couldn't load. Check your connection."
5. **§3.1:** add a "Map" page (or a map view on Explore) showing every place, and link it from the navigation.
6. **Cloudinary or persistent storage** for uploads before hosting, since `backend/uploads/` is local disk.
7. **SEC-06:** deploy behind HTTPS and set `CORS_ORIGINS` and `VITE_API_BASE_URL` for the hosted domains.

**Low**
8. **OpenAPI/Swagger** description of the API (§6.2).
9. **Dockerfile and a GitHub Actions workflow** running `tsc` and `npm test` (§6.2).
10. **Postman:** add the `POST /api/uploads` request to the collection.
11. **BR-02:** check hours and facilities on site and record the date checked.
12. **SRS or report update:** record Tailwind → CSS tokens, MySQL → MariaDB, OSRM, and the table-name underscores.
