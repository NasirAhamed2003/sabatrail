# SabaTrail: Mandatory Requirements Compliance Check

**Date:** 22 October 2026
**Code checked:** branch `redesign/remediation`, commit `638cfb9`.

**How each item was checked:**
1. Located the code that implements it (file and line, API endpoint, or component).
2. Exercised it in the running app: API on `localhost:5000`, web on `localhost:5173`, against the seeded MariaDB database, driven by headless Chrome.
3. Captured screenshots of the key screens, saved in [`docs/compliance-evidence/`](docs/compliance-evidence/).

The two test accounts and the test place created during the check were removed afterwards. The database is back to its seeded 21 places.

**Verdict key:**
- ✅ Met
- 🟡 Partial
- ❌ Not met

---

## 1. Compliance table

| # | Requirement | Verdict | Evidence | Notes |
|---|---|---|---|---|
| 1 | At least 10 tourist attractions within 25 km of Hemmathagama | ✅ | Seed `backend/prisma/seed.ts:50` (21 places). Home point `backend/Src/geo.ts:5-6`. Stored distance calculated server-side with Haversine, `geo.ts:9-31` and `controllers/placeController.ts:10-16`. Test `backend/tests/api.test.ts:101-106`. `GET /api/places` | **21 places, all within 25 km. The farthest is 20.55 km** (National Museum of Kandy). All have coordinates. Stored and independently recalculated distances agree to 0.1 km. 15 are attractions (religious, nature, heritage, recreational); the other 6 are restaurants, hospitals and a bus stand. Table in §2. |
| 2 | Display a list of attractions | ✅ | `frontend/src/pages/HomePage.tsx` (Explore grid); `components/PlaceCard.tsx:26-68`; data from `GET /api/places` via `lib/places.ts` | **21 of 21 API places rendered** in the grid, with none missing. Screenshot `2-list.png`. |
| 3 | Filter by category | ✅ | Chips `HomePage.tsx:141-147`; logic `HomePage.tsx:37-56`; categories from `GET /api/categories`; seed `seed.ts:15-22` | All six categories exist. Each chip showed exactly the matching places, and only those. Screenshot `3-filter-restaurants.png`. |
| 4 | Descriptions, opening hours, travel tips and distances for each attraction | ✅ | Details: `pages/PlaceDetailsPage.tsx:183-186` (distance, hours), `:201` (About), `:239-242` (travel tips). Card: `PlaceCard.tsx:41` (summary), facts list (distance, hours). Data: `backend/prisma/seed.ts` | **All four fields are shown for all 21 places**, on the place page and (except tips) on the card. Re-verified after the data update below. Most opening hours are sample values to confirm on site (see note). |
| 5 | Show attraction locations on a map | ✅ | `components/PlaceMap.tsx:70-92` (React Leaflet + OSM); markers built from stored latitude and longitude, `PlaceDetailsPage.tsx:140`; planner route map `pages/PlanPage.tsx:663` | On all 21 place pages, the "this place" marker sits within **0.7 px** of the point calculated from the stored coordinates. That's measured against the actual OSM map tiles at zoom 11. Screenshot `5-map-details.png`. |
| 6 | Create a one-day trip plan by selecting places | ✅ | "Add to my day" `components/AddToDayButton.tsx:34` → `lib/plans.tsx:179` (`POST /api/visit-plans/:id/places`); plan created at `lib/plans.tsx:286` (`POST /api/visit-plans`); login redirect `lib/plans.tsx:220`; planner `/plan` (`App.tsx:24-39`, `RequireAuth`); summary `components/TripSummary.tsx` | **Walked end to end.** As a logged-out visitor, "Add to my day" went to `/login?next=…`. After registering, three places were added from the Explore grid. `/plan` showed them in order (1 Gadaladeniya Vihara, 2 Lankatilaka Vihara, 3 Embekka Devalaya), with a summary of 3 stops, about 2 h 30 min at stops, about 50 min driving, about 3 h 20 min in total. **Login is required to save a plan; browsing isn't.** Screenshot `6-plan.png`. |
| 7 | Admin can add, edit and delete attractions (admin only) | ✅ | Endpoints `POST /api/places`, `PUT /api/places/:id`, `DELETE /api/places/:id` (`?force=true` if the place is in plans), all `authenticateToken` + `requireAdmin`, `backend/Src/routes/placeRoutes.ts:21-23`. UI: `pages/admin/AdminPlacesPage.tsx` (list, Edit, Delete with confirmation), `pages/admin/PlaceFormPage.tsx` (add and edit). Guards `components/RouteGuards.tsx:19-30` | Through the admin UI: **added** a place (saved, 5.2 km), **edited** its name (saved), **deleted** it from the list (then `GET` returns 404). **Non-admins are blocked:** no token → 401, logged-in visitor → 403 for create, update and delete. A visitor opening `/admin/places` sees "Administrators only". Screenshot `7-admin-list.png`. |
| — | No booking or payment (must be absent) | ✅ | Searched the frontend, backend and schema for booking, payment, checkout, reservation, Stripe, PayPal, PayHere, cart, ticket, invoice and price; checked both `package.json` files | **None present.** The only matches are the scope notice at `HomePage.tsx:256` ("not a transport, booking, ticketing or emergency service") and a travel tip mentioning a ticket office. No payment libraries are installed. |
| — | Four stakeholders consulted, with feedback evidence | 🟡 | Project proposal `ITE2953_ProjectProposal_E2410404.pdf`: §1.6 (p. 7), Appendix A.1 (p. 19), A.2 Table 5 (p. 20), screenshots (p. 21) | Four stakeholders are named, with dated feedback. Discussion screenshots show only two of them. No sign-off of the seven features. Details in §3. |

### Requirement 4 in detail (all 21 places, checked on each details page and card)

| Field | Stored | Shown on details page | Shown on card |
|---|---|---|---|
| Description | 21 / 21 | 21 / 21 (About) | 21 / 21 (summary) |
| Distance | 21 / 21 | 21 / 21 ("km by road from…", Haversine fallback) | 21 / 21 |
| Opening hours | 21 / 21 | 21 / 21 (hospitals show "Open 24 hours") | 21 / 21 |
| Travel tips | 21 / 21 | 21 / 21 | Details page only, by design |

**Update, 22 October 2026: the data gap is closed.**
- **Hours:** the first check found hours for only 3 places and travel tips missing for 5. Opening hours were added for the other 18 places in `backend/prisma/seed.ts` and applied with `npx prisma db seed`.
- **Tips:** travel tips were added for the 2 hospitals and the 3 restaurants.
- **Re-check:** in the running app, all 21 cards and all 21 place pages now show all four fields.

**Note on hours: most are sample values, not verified.**
- Only the Temple of the Tooth, Pinnawala and Peradeniya hours come from published sources.
- The others are typical visiting hours: daylight hours for open-air sites, and 24 hours for the hospitals.
- They should be confirmed on site and corrected through Admin → Places → Edit (SRS BR-02).
- The app already labels hours as "a guide, not a guarantee".

---|---|---|---|---|
| Description | 21 / 21 | 21 / 21 (About) | 21 / 21 (summary) | ✅ |
| Distance | 21 / 21 | 21 / 21 ("km by road from…", Haversine fallback) | 21 / 21 | ✅ |
| Opening hours | **3 / 21** | 3 real; **18 show "Check locally"** | 3 / 21 | 🟡 |
| Travel tips | **16 / 21** | 16 / 21; the section is hidden when there are none | Details page only | 🟡 |

- **Places with opening hours:**
  - Temple of the Sacred Tooth Relic
  - Royal Botanic Gardens, Peradeniya
  - Pinnawala Elephant Orphanage

  The seed only sets hours that are widely published (`seed.ts:11`). The admin page reports this itself: "18 without opening hours" (`AdminPlacesPage.tsx:72,139-140`).
- **Places with no travel tips:**
  - Hemmathagama Hospital
  - Base Hospital Mawanella
  - Hela Bojun, Mawanella
  - Seetha's, Mawanella
  - Jamboo Hotel & Restaurant

  None of these is a tourist attraction. All 15 attractions have travel tips. Only 3 of the 15 have opening hours.

**To reach ✅:** an admin enters verified opening hours, and travel tips where missing, through Admin → Places → Edit. No code change is needed. This shouldn't be guessed; hours must be checked against reality (SRS BR-02).

---

## 2. Requirement 1: every seeded place

Distances are from Hemmathagama town centre (7.1738895, 80.4998611; OpenStreetMap node 1831898259).

- **Stored:** the value the API returns.
- **Recalculated:** an independent Haversine calculation during this check.
- **Marker offset:** the requirement 5 measurement on that place's details page.

| # | Place | Category | Latitude, longitude | Stored (km) | Recalculated (km) | Hours | Tips | Marker offset |
|---|---|---|---|---|---|---|---|---|
| 1 | Hemmathagama Bus Stand | Public/Useful | 7.17551, 80.50058 | 0.2 | 0.20 | yes | yes | 0.7 px |
| 2 | Hemmathagama Hospital | Public/Useful | 7.17330, 80.50158 | 0.2 | 0.20 | yes | yes | 0.3 px |
| 3 | Ambuluwawa | Nature/Scenic | 7.16107, 80.54734 | 5.4 | 5.43 | yes | yes | 0.5 px |
| 4 | Jamboo Hotel & Restaurant | Restaurants/Dining | 7.16411, 80.55338 | 6.0 | 6.00 | yes | yes | 0.4 px |
| 5 | Bible Rock (Bathalegala) | Nature/Scenic | 7.18833, 80.43444 | 7.4 | 7.39 | yes | yes | 0.4 px |
| 6 | Embekka Devalaya | Heritage/Cultural | 7.21792, 80.56772 | 8.9 | 8.94 | yes | yes | 0.3 px |
| 7 | Dawson Tower | Heritage/Cultural | 7.25668, 80.51796 | 9.4 | 9.42 | yes | yes | 0.4 px |
| 8 | Hela Bojun, Mawanella | Restaurants/Dining | 7.24907, 80.45979 | 9.5 | 9.46 | yes | yes | 0.5 px |
| 9 | National Railway Museum, Kadugannawa | Recreational | 7.25761, 80.52090 | 9.6 | 9.59 | yes | yes | 0.1 px |
| 10 | Lankatilaka Vihara | Religious | 7.23388, 80.56470 | 9.8 | 9.78 | yes | yes | 0.3 px |
| 11 | Seetha's, Mawanella | Restaurants/Dining | 7.25205, 80.44764 | 10.4 | 10.43 | yes | yes | 0.4 px |
| 12 | Base Hospital Mawanella | Public/Useful | 7.25356, 80.44583 | 10.7 | 10.68 | yes | yes | 0.3 px |
| 13 | Gadaladeniya Vihara | Religious | 7.25730, 80.55608 | 11.2 | 11.16 | yes | yes | 0.5 px |
| 14 | Utuwankanda | Heritage/Cultural | 7.26199, 80.41916 | 13.2 | 13.24 | yes | yes | 0.5 px |
| 15 | Alagalla Mountain Range | Nature/Scenic | 7.29798, 80.47157 | 14.1 | 14.15 | yes | yes | 0.4 px |
| 16 | Royal Botanic Gardens, Peradeniya | Recreational | 7.27111, 80.59556 | 15.1 | 15.11 | yes | yes | 0.3 px |
| 17 | Ceylon Tea Museum | Recreational | 7.26861, 80.63266 | 18.0 | 18.04 | yes | yes | 0.3 px |
| 18 | Pinnawala Elephant Orphanage | Recreational | 7.30056, 80.38833 | 18.7 | 18.70 | yes | yes | 0.1 px |
| 19 | St. Paul's Church, Kandy | Religious | 7.29453, 80.63969 | 20.4 | 20.44 | yes | yes | 0.3 px |
| 20 | Temple of the Sacred Tooth Relic | Religious | 7.29360, 80.64140 | 20.5 | 20.52 | yes | yes | 0.5 px |
| 21 | National Museum of Kandy | Heritage/Cultural | 7.29472, 80.64083 | 20.6 | 20.55 | yes | yes | 0.6 px |

**Category counts:** Religious 4, Nature/Scenic 3, Heritage/Cultural 4, Recreational 4, Restaurants/Dining 3, Public/Useful 3.

**The API test that enforces this rule** (`backend/tests/api.test.ts:101-106`):

```ts
test("at least 10 places, all within 25 km of Hemmathagama", async () => {
  ...
  assert.ok(data.length >= 10, `expected >= 10 places, got ${data.length}`);
  ...
  assert.ok(place.distance <= 25, `${place.place_name} is ${place.distance} km away`);
```

The current suite has 32 tests and all pass (`npm test` in `backend/`).

---

## 3. Stakeholder consultation evidence

This is a documentation item. It sits in the project proposal, not the codebase, and code can't satisfy it.

### What exists
In `ITE2953_ProjectProposal_E2410404.pdf`, in the project's parent folder:

**1. §1.6 Stakeholder Identification Plan, Table 2 (p. 7).** Four stakeholders, all group members:

| Stakeholder | Discussion area |
|---|---|
| Rathnayaka RMHM | Place information and search |
| Thilakarathna MANC | Map and route requirements |
| Danthanarayana HG | One-day planning |
| Zamra MZF | User-friendly design |

**2. Appendix A.1 (p. 19): ten stakeholder questions.** They cover:
- what to know before visiting;
- place types;
- whether search and filtering would be useful;
- whether a map would be useful;
- one-day planning;
- visit duration;
- nearby places;
- travel tips;
- restaurants;
- other features.

**3. Appendix A.2, Table 5 (p. 20): dated feedback (4 to 10 August 2026), with the requirement each led to:**

| Stakeholder | Feedback | Requirement identified |
|---|---|---|
| Rathnayaka | Safety, accessibility, facility and travel information | Parking, toilets, drinking water, wheelchair access, nearby medical services, safety warnings, road conditions, clothing |
| Thilakarathna | Practical, accurate local information | Entry fees, transport, accessibility, visit duration, best time, facilities, safety, nearby services, photos, ratings, reviews |
| Danthanarayana | Travel time, distance and transport information | Estimated distance, travel time, transport methods, accessibility |
| Zamra | Simple, clear, user-friendly design | Simple language, clear buttons, easy navigation, clean layouts, direct access to details and planning |

**4. Screenshots (p. 21): four images from the module discussion forum.**
- Topics: "Identify what information a tourist needs", "Safety, Accessibility, and Visitor Convenience", "Travel Tips and Visitor Information", "Stakeholder Role Allocation", and the Phase 2 feedback-video thread.
- Posts are visible from E2410406 Rathnayaka RMHM, E2410414 Thilakarathna MANC and the author, E2410404 Ahamed MSN.

### Gaps
1. **Only two of the four stakeholders appear in the screenshots.** Rathnayaka and Thilakarathna do. **Danthanarayana HG and Zamra MZF appear only in Table 5,** with no screenshot of their own contributions.
2. **The proposal still has placeholder text:**
   - §1.6 says names and feedback "will be added after completing the required discussions".
   - Appendix A says it "will contain evidence".
   - The page with the screenshots is headed "Screenshots of the actual stakeholder discussions will be included here."
   - The final submission checklist (p. 23) still lists "Stakeholder discussion completed", "Stakeholder evidence/screenshots added", "Three user interviews completed" and "Feedback video prepared". None of these is evidenced in the repo or the folder.
3. **No validation of the seven mandatory features.**
   - The questions do touch on most of them: search and filter, map, one-day planning, visit duration, travel tips.
   - But there's no recorded answer or sign-off from the stakeholders confirming them.
   - Some feedback asks for things outside or beyond scope: entry fees, ratings and reviews, transport methods, accessibility fields. SRS §6.3 lists these as optional and not built.
4. **Nothing in the repository.** There's no stakeholder or feedback document, no meeting notes, and no validation record. It all lives in the proposal PDF only.

**Verdict: 🟡 Partial.** Four stakeholders are named, with dated feedback. Direct evidence exists for two of them, and there's no explicit validation of the required features.

---

## 4. Summary

**All seven mandatory features are met** (re-verified after the 22 October data update).
- **Feature 1:** 21 places, all within 25 km, the farthest at 20.55 km.
- **Features 2 and 3:** the catalogue lists all 21 places, and the filter is correct for all six categories.
- **Feature 5:** map markers sit within 0.7 px of the stored coordinates on every place page.
- **Feature 6:** browse, add and view a one-day plan works end to end. Login is needed to save a plan.
- **Feature 7:** admin add, edit and delete work through the UI, with non-admins blocked by both the API (401/403) and the UI.
- **Feature 4:** description, opening hours, travel tips and distance are now shown for all 21 places. Most opening hours are sample values to confirm on site.

**Booking and payment are correctly absent.** There's no such code or dependency, and the home page states the scope.

**Stakeholder evidence is incomplete.**
- Four stakeholders are named, with dated feedback, in the proposal.
- Discussion screenshots show only two of them (Rathnayaka and Thilakarathna).
- Placeholder wording remains.
- Nothing records the stakeholders validating the required features.

**Still outstanding:**
1. Confirm the 18 sample opening hours on site and correct any that are wrong (Admin → Places → Edit).
2. In the proposal or SRS appendix:
   - add evidence of Danthanarayana HG's and Zamra MZF's participation, such as screenshots or notes;
   - replace the placeholder sentences;
   - record a short stakeholder validation of the seven mandatory features (who confirmed what, and when).
3. Optionally, keep a copy of the stakeholder evidence in the repo (for example `docs/stakeholders.md`) so it travels with the code.
