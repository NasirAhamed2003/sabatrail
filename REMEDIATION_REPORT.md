# SabaTrail — Remediation Report

**Branch:** `redesign/remediation` (10 commits on top of `main`).
**Date:** 2026-10-22.

**Inputs:**
- the requirements verification audit against SRS v1.1;
- [UIUX_AUDIT.md](UIUX_AUDIT.md).

**How it was verified:**
- **Typecheck and lint:** `tsc` passes on both projects, and the frontend lints with **0 errors**. The original `main` had 3 lint errors.
- **API tests** (`backend/tests/api.test.ts`): **27/27** pass.
- **Postman collection:** a 36-request replay returns the expected status for every request.
- **Headless-Chrome flow tests**, re-run after the final phase:

  | Flow | Result |
  |---|---|
  | Auth | 14/14 |
  | Add-to-day and route guidance | 31/31 |
  | Planner | 29/29 |
  | Admin | 36/36 |

- **Route audit:** every route at 1440, 768 and 375px. No horizontal overflow, one `h1` per page, 0 unlabelled controls, 0 console errors.

---

## 1. Summary

| | Before (audit) | After |
|---|---|---|
| Functional requirements, fully met | 34 / 59 (58%) | **57 / 59 (97%)** |
| Functional requirements, missing | 10 | **0** |
| Non-functional requirements, fully met | 8 / 21 (38%) | **19 / 21 (90%)** |
| UI/UX findings resolved (C, H, M, L) | — | **34 / 35** |
| `App.css` | 4,957 lines, 222 `!important` | **deleted**; per-component CSS with tokens, no `!important` outside the reduced-motion rule |

**Still partial:**
- FR-021: map tiles have no offline message.
- FR-033: empty plans are allowed on purpose.
- NFR-SEC-06: HTTPS is a deployment step.
- NFR-QUAL-06: the `Src` folder isn't renamed.
- BR-02: no "verified" flag on places.
- BR-06: no offline notice.
- L6: hero illustration offset.

Each is explained in §5.

---

## 2. Commits

| Phase | Commit | Scope |
|---|---|---|
| — | `6c3e48e` | UI/UX audit document |
| 1 | `e42713f` | Backend, schema, config, validation, seed |
| 2 | `ba7ee25` | Design tokens; Vite template CSS removed |
| 3 | `0e050a1` | React Router, app shell, responsive navbar |
| 4 | `9e3f1d0` | Register, logout, account menu |
| 5 | `6846c6e` | Add to my day, place details, route guidance, nearby places and food stops |
| 6 | `8251f07` | Planner redesign; plan rename, delete and reorder API |
| 7 | `3bd8900` | Admin redesign; safe deletes |
| 8 | `7abe493` | Shared components, accessibility, content |
| 9 | `0116fe5` | CSS consolidation |
| 10 | *(this commit)* | API tests, Postman collection, this report |

---

## 3. Functional requirements

✅ met · 🟡 partial · ❌ missing

| ID | Requirement | Before | After | Fixed in | Evidence / notes |
|---|---|---|---|---|---|
| FR-001 | ≥10 places within 25 km | 🟡 | ✅ | P1 | Seed: 21 real places, all ≤20.6 km (OSM/Wikidata coordinates); covered by an API test |
| FR-002 | Browse places | ✅ | ✅ | P5 | Catalogue grid (`PlaceCard`) |
| FR-003 | Six categories | 🟡 | ✅ | P1 | Seeded; unique names; covered by an API test |
| FR-004 | Place listing | ✅ | ✅ | P5 | Compact cards: photo, category, summary, distance, duration, hours |
| FR-005 | Responsive catalogue | ✅ | ✅ | P5 | 3/2/1 columns; verified at 1440/768/375 |
| FR-006 | Search | ✅ | ✅ | P5 | Live search (the fake Search button is gone) |
| FR-007 | Category filter | ✅ | ✅ | P5 | Chips with `aria-pressed` |
| FR-008 | Search + filter together | ✅ | ✅ | — | Unchanged logic |
| FR-009 | Empty-result message | ✅ | ✅ | P5 | Plus a Clear filters action |
| FR-010 | Core place details | ✅ | ✅ | P5 | `/places/:id`: key facts row |
| FR-011 | Tips, facilities, images | ✅ | ✅ | P1, P5 | Real Commons photos with credits |
| FR-012 | Map location | 🟡 | ✅ | P5 | Leaflet map on every details page (place, start, nearby, food) |
| FR-013 | Suitability tags | 🟡 | ✅ | P5 | "Good for" chips |
| FR-014 | Before You Go | ❌ | ✅ | P1, P5 | `before_you_go` column; clothing, footwear, carry, safety; general advice where a place has none |
| FR-015 | Admin data as source | ✅ | ✅ | — | |
| FR-016 | Leaflet + OSM | ✅ | ✅ | P5 | Shared `PlaceMap` |
| FR-017 | Markers from lat/long | ✅ | ✅ | P5 | Numbered stops, start, nearby and food markers |
| FR-018 | Route from start to place | ❌ | ✅ | P5 | Each planner leg links Google Maps directions from the town centre or previous stop; a whole-day route link adds waypoints |
| FR-019 | Google Maps Directions | ❌ | ✅ | P5 | Directions **links** (the SRS allows "API/Link"); see §6 |
| FR-020 | Haversine distance | ❌ | ✅ | P1, P5 | Server computes the stored distance; the client computes from the town centre or the visitor's location |
| FR-021 | Graceful map/route failure | 🟡 | 🟡 | P5–P6 | API down, OSRM down ("Travel time unavailable") and missing coordinates are handled. Tile-load failure has no message |
| FR-022 | Secure admin login | 🟡 | ✅ | P1, P4 | Seed provisions the admin; role is an enum; documented in README |
| FR-023 | Registration | 🟡 | ✅ | P1, P4 | `/register` with client and server validation |
| FR-024 | Login | ✅ | ✅ | P4 | Returns to `?next`; real logout |
| FR-025 | bcrypt | ✅ | ✅ | — | Covered by an API test |
| FR-026 | JWT | ✅ | ✅ | P1 | One shared secret and fallback; secret rotated |
| FR-027 | Admin role restriction | ✅ | ✅ | — | 403 covered by an API test |
| FR-028 | Clear invalid-credentials error | ✅ | ✅ | — | |
| FR-029 | Select multiple places | ✅ | ✅ | P5 | "Add to my day" from cards, details, nearby and food lists |
| FR-030 | Use visit duration | 🟡 | ✅ | P1, P5 | `visit_duration_minutes` (backfilled); summed in plans |
| FR-031 | Maintain visit order | ✅ | ✅ | P6 | Keyboard-accessible ↑/↓; one transactional reorder |
| FR-032 | Add to an existing plan | ✅ | ✅ | P5 | Plan picker when there are several plans |
| FR-033 | Prevent empty plan | 🟡 | 🟡 | P5–P6 | Adding requires a selection. Empty plans stay allowed by design (§5) |
| FR-034 | Nearby places | ❌ | ✅ | P5 | Details page: places within 8 km by Haversine |
| FR-035 | Nearby on the map | ❌ | ✅ | P5 | Nearby markers and legend |
| FR-036 | Restaurants as food stops | ❌ | ✅ | P5 | "Food stops nearby" (details) and "Food stops for your day" (planner) |
| FR-037 | From admin data | ❌ | ✅ | P5 | Uses catalogue coordinates and categories |
| FR-038 | Summary: places | ✅ | ✅ | P6 | Timeline |
| FR-039 | Summary: order | ✅ | ✅ | P6 | Numbered timeline and map |
| FR-040 | Approximate distance | 🟡 | ✅ | P5–P6 | Road distance per leg (OSRM); the meaningless distance sum is removed |
| FR-041 | Travel time | ❌ | ✅ | P5 | Per leg and total, from OSRM |
| FR-042 | Visit duration | 🟡 | ✅ | P5 | "Time at stops" total |
| FR-043 | Total journey time | ❌ | ✅ | P5 | "Total day" = drive + visit |
| FR-044 | Estimates labelled | 🟡 | ✅ | P5 | "Estimates, not guarantees" plus a traffic, weather and road-works note |
| FR-045 | Save and access plans | ✅ | ✅ | P6 | Plus rename, change date and delete |
| FR-046 | Admin: add place | ✅ | ✅ | P7 | Sectioned form page |
| FR-047 | Admin: edit place | ✅ | ✅ | P7 | |
| FR-048 | Admin: delete place | 🟡 | ✅ | P7 | 409 explains which plans are affected; `?force=true` after a named confirmation |
| FR-049 | Update descriptions, times, images, tips | ✅ | ✅ | P7 | `type="time"`, minutes, image preview |
| FR-050 | All place fields | ✅ | ✅ | P7 | Includes "Before you go" and photo credit |
| FR-051 | Prisma / MySQL | ✅ | ✅ | P1 | Additive migration `20261022120000_…` |
| FR-052 | Validate before save | 🟡 | ✅ | P1, P7 | zod on the server; inline client checks; server errors mapped to fields |
| FR-053 | Block non-admins | ✅ | ✅ | — | |
| FR-054 | Admin: view categories | ✅ | ✅ | P7 | With place counts |
| FR-055 | Admin: add category | ✅ | ✅ | P7 | Unique names, with a clear message |
| FR-056 | Admin: edit category | ✅ | ✅ | P7 | A row form: Enter saves, Escape cancels |
| FR-057 | Remove if unused | 🟡 | ✅ | P7 | Explicit 409 with a place count; the UI explains instead of failing |
| FR-058 | Categories table | ✅ | ✅ | — | |
| FR-059 | Block non-admins | ✅ | ✅ | — | |

## 4. Non-functional requirements and business rules

| ID | Before | After | Fixed in | Evidence / notes |
|---|---|---|---|---|
| PERF-01 responsive UI | ✅ | ✅ | — | Measured (below) |
| PERF-02 search/filter < 2 s | ✅ | ✅ | P5 | 0.006 ms per keystroke (client-side, 21 places) |
| PERF-03 planner update < 2 s | 🟡 | ✅ | P6 | Reorder is one request (median 4.3 ms); removal renumbers server-side (was one PUT per stop) |
| PERF-04 desktop/tablet/mobile layouts | ✅ | ✅ | P2–P9 | Verified at 1440/768/375, no overflow |
| PERF-05 distinguish service failures | 🟡 | ✅ | P4–P6 | "Couldn't reach SabaTrail" vs API messages vs "Travel time unavailable" |
| SAFE-01 estimates not guaranteed | 🟡 | ✅ | P5 | |
| SAFE-02 safety, clothing, footwear | 🟡 | ✅ | P5 | Before You Go |
| SAFE-03 not a transport/emergency/ticketing service | ❌ | ✅ | P8 | Scope notice and emergency numbers (1990 / 119) in "How it works" |
| SAFE-04 traffic variance | ❌ | ✅ | P5 | Disclaimer on every day estimate |
| SEC-01 bcrypt | ✅ | ✅ | — | |
| SEC-02 JWT | ✅ | ✅ | P1, P4 | Shared secret; a rejected token ends the session in the UI |
| SEC-03 admin gate | ✅ | ✅ | P3 | Server middleware plus route guards |
| SEC-04 server-side validation | 🟡 | ✅ | P1 | zod everywhere; malformed JSON → 400 |
| SEC-05 no leakage in errors | 🟡 | ✅ | P1 | No raw `error.message`; `/api/test-*` only with `ENABLE_TEST_ROUTES=true` outside production |
| SEC-06 HTTPS in production | ❌ | 🟡 | P1 | API URL from `VITE_API_BASE_URL`, CORS allowlist, production refuses to start without `JWT_SECRET`. TLS itself is a hosting step |
| QUAL-01 usability | ✅ | ✅ | P3–P8 | |
| QUAL-02 responsiveness | ✅ | ✅ | | |
| QUAL-03 maintainability | 🟡 | ✅ | P3, P8, P9 | Pages, components and lib modules; shared UI kit; per-component CSS |
| QUAL-04 reliability | 🟡 | ✅ | P5–P7 | Error-aware states; undo; safe deletes |
| QUAL-05 testability | 🟡 | ✅ | P10 | 27 API tests (`npm test`); Postman collection |
| QUAL-06 consistency | 🟡 | 🟡 | P2, P9 | Tokens and one component set. The `Src` vs `src` folder casing remains (§5) |
| BR-01 ≥10 places / 25 km | 🟡 | ✅ | P1 | |
| BR-02 verified details | 🟡 | 🟡 | P1 | Sources documented; no "verified" flag |
| BR-03 admin-only edits | ✅ | ✅ | | |
| BR-04 defined user flow | 🟡 | ✅ | P3–P5 | Browse → add → plan, with routes |
| BR-05 no booking/payment | ✅ | ✅ | P8 | Stated explicitly in "How it works" |
| BR-06 map needs internet | 🟡 | 🟡 | | Still no offline notice |
| BR-07 travel time varies | ❌ | ✅ | P5 | |

**Measured performance** (local, 20 runs each):

| Request | Median | p95 |
|---|---|---|
| `GET /places` | 3.1 ms | 46 ms |
| Reorder | 4.3 ms | — |
| Planned-time save | 3.6 ms | — |
| Plan stops | 2.2 ms | — |

**Database:**
- All 5 tables, keys and relations are unchanged.
- One additive migration:
  - `description`, `travel_tips`, `facilities` and `image` → `TEXT`;
  - new `visit_duration_minutes` (backfilled), `before_you_go` and `image_credit`;
  - `role` becomes an enum;
  - unique `category_name`;
  - unique `(plan_id, place_id)`.
- The legacy `visit_duration` text column is kept and written in sync for display.

## 5. UI/UX audit findings

| ID | Finding | After | Fixed in |
|---|---|---|---|
| C1 | Dark-mode leak / ghost text | ✅ Template CSS removed, `color-scheme: light`, explicit control colours | P2 |
| C2 | Logged-in mobile nav overflow | ✅ New header; menu below 960px | P3 |
| C3 | Planner card text squeezed into a 140px column | ✅ Image slot always rendered; text column ≥ 250px (tested) | P6 |
| C4 | Admin 634px wide on phones | ✅ Template `#root` removed; cards below 960px | P2, P7 |
| H1 | No add-to-plan from browse | ✅ Add to my day, with resume after login | P5 |
| H2 | No logout / register | ✅ | P4 |
| H3 | No router | ✅ | P3 |
| H4 | Template `#root` centring and borders | ✅ | P2 |
| H5 | Text contrast | ✅ Muted text #5f6b64, eyebrows #3f6b4d, 12px minimum | P2 |
| H6 | Input border contrast | ✅ #7d8c82 (3.5:1) | P2 |
| H7 | 6,900px single-column feed | ✅ Card grid plus details pages | P5 |
| H8 | Unfinished planner | ✅ Timeline redesign | P6 |
| H9 | Misleading errors; date mismatch | ✅ | P1, P6 |
| H10 | Flat 15-field admin form | ✅ Sectioned form, map picker, inline validation | P7 |
| M1 | Fake Search button | ✅ Removed | P5 |
| M2 | Category `<select>` | ✅ Chips | P5 |
| M3 | A PUT per keystroke on time inputs | ✅ 600 ms debounce or blur, inline "Saved" | P6 |
| M4 | Visit date never shown | ✅ Header and switcher | P6 |
| M5 | Confusing summary labels | ✅ | P6 |
| M6 | No reorder, rename or delete | ✅ | P6 |
| M7 | `nth-of-type` clamp | ✅ Removed with the old CSS | P6, P9 |
| M8 | Fragile category edit form | ✅ | P7 |
| M9 | Fake admin tabs | ✅ Routes | P7 |
| M10 | Admin table has no search/sort | ✅ | P7 |
| M11 | `window.confirm` deletes | ✅ Named dialogs; undo for stop removal | P6, P7 |
| M12 | Inconsistent headings | ✅ Display font on every heading via the base styles | P2 |
| M13 | Template title and filler | ✅ | P8 |
| M14 | Unannounced updates; `aria-label` on a `div` | ✅ | P5, P8 |
| M15 | Tap targets < 44px | ✅ All except one inline sentence link (WCAG exception) | P8 |
| L1 | Render-blocking fonts | ✅ `<link>` with preconnect | P8 |
| L2 | Reduced motion | ✅ | P8 |
| L3 | Focus ring | ✅ Global `:focus-visible` | P8 |
| L4 | Map heights, popups, directions | ✅ | P5 |
| L5 | Glyph icons | ✅ Inline SVG icon set | P5 |
| L6 | Hero mountain offset at 768px | ❌ Not changed (cosmetic; clipped by its container) | — |

**Redesign brief (UIUX_AUDIT.md §5):**

| Brief item | Status |
|---|---|
| §5.2 compact browse + details | ✅ Done |
| §5.3 Your-day bar / rail | ✅ Done |
| §5.4 planner timeline | ✅ Done |
| §5.5 admin tool | ✅ Done. The place form is its own page rather than a drawer, which works better on phones |
| §5.1 trail identity | 🟡 Partly done: dashed trail on the timeline and map, sand "in your day" accent, trail-marker favicon. **The hero still uses the illustration instead of real photography.** |

## 6. Deliberately left out, and why

| Item | Why |
|---|---|
| **Cloudinary uploads** (SRS tech stack) | **Local upload is now implemented** (commit `419f9b1`). Admins upload a JPEG, PNG or WebP (up to 5 MB) from the place form, by drag and drop or "Choose image". The admin-only `POST /api/uploads` checks the file's bytes, saves it under a random name in `backend/uploads/`, and serves it at `/uploads/...`. Replaced or deleted uploads are cleaned up. Pasting an external URL (Wikimedia) still works. Cloudinary remains an optional future swap: it needs an account and credentials, and only the storage step in `Src/uploads.ts` would change. |
| **Site logo** | **Now wired in.** A single `<Logo>` component is used in the header and footer. It picks up `frontend/src/assets/logo.svg` (and an optional `logo-mark.svg` for narrow screens) automatically when the files are added. Until then, the original "S" mark is shown. The favicon is `public/favicon.svg`, with a 32×32 `favicon.png` fallback. |
| **Google Directions *API*** | Needs a billed API key. Directions use Google Maps **links** (the SRS allows "API/Link"). Travel times come from the public OSRM service (OpenStreetMap roads), clearly labelled as estimates, with a "Travel time unavailable" fallback. The OSRM demo server is fine for a prototype; production should use a hosted routing service. |
| **Empty plans (FR-033)** | Smallest reasonable choice: "Add to my day" always creates a plan together with its first stop, but an empty plan can still be created on purpose ("Create an empty plan"), and the planner shows guidance when a plan is empty. Blocking empty plans entirely would also block that legitimate step. |
| **HTTPS (SEC-06)** | TLS is configured by the host or reverse proxy. The app is ready: environment-based API URL, CORS allowlist, and a production start that refuses to run without `JWT_SECRET`. |
| **Map-tile failure and offline notice (FR-021, BR-06)** | Not in the phase list; Leaflet shows grey tiles. A small `tileerror` handler showing "Map tiles couldn't load" would close both. |
| **`Src` → `src` rename (QUAL-06)** | Not in the phase list, and renaming a folder on Windows through git needs two steps. It only matters on case-sensitive filesystems (Linux CI/hosting). |
| **"Verified" flag for places (BR-02)** | Would need a schema field and an admin workflow that the brief didn't ask for. Data sources are documented in the seed and README. |
| **Hero photography, dark theme** | Design direction, not a listed phase. The light theme is enforced (the old dark mode was broken). |
| **Token storage** | The JWT stays in `localStorage` as before; moving to httpOnly cookies would change the API contract. |

## 7. Data and environment notes

- **`uxtest@sabatrail.local` and "Kadugannawa Day Trip" are kept.** The plan's third stop was the placeholder "Kadugannawa Rest Stop"; the Phase 1 seed moved it to the nearest real restaurant, **Hela Bojun, Mawanella**.
- **Flow tests left test accounts in the development database:** 24 users matching `e2e-*`, `day-*`, `plan-*`, `postman-*` at `sabatrail.local`, with 22 plans. The automated API tests clean up after themselves. These can be removed with one SQL statement if wanted.
- **The `.env` password item in the brief was already resolved.** `DATABASE_URL` uses the dedicated `sabatrail` database user, whose password has no special characters. `JWT_SECRET` was rotated in Phase 1, so tokens issued before then no longer work.
- **New admin credentials setting:** `SEED_ADMIN_PASSWORD` in `backend/.env` (not committed); see README.
- **Wikimedia's robot policy blocks scripted `curl` requests** for thumbnails (HTTP 429). Browsers load them normally, as every screenshot shows.
