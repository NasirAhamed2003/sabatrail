# SabaTrail — UI/UX Audit

**Scope:** the whole React frontend (`frontend/src`, `frontend/index.html`): the public site, the login page, the visit planner and the admin dashboard.
**Date:** 2026-10-22.
**How it was checked:**
- I read every frontend file, including all 4,957 lines of `App.css`.
- I captured the running app (Vite on :5173, API on :5000, 12 sample places) in headless Chrome at **1440×900 (desktop)**, **768×1024 (tablet)** and **375×812 (mobile)**.
- States captured: logged out, logged in as a user, logged in as an admin, loading, backend down, no results, login error, and the OS set to dark mode.
- A script inside the page measured tap-target sizes, horizontal overflow, heading order, alt text and labels.
- WCAG contrast ratios are calculated from the actual hex values in the CSS.

**What could not be verified:**
- *Cards with real photos.* No seeded place has an image, so every card showed the "Image coming soon" placeholder. Image layouts are judged from the CSS only.
- *Screen-reader output.* No assistive technology was run.
- *Focus rings.* Headless Chrome doesn't reliably apply `:focus-visible`, so focus findings come from reading the CSS.
- *Map behaviour offline.* Not tested.

---

## 1. Executive summary

**Verdict.** The *public landing page* is pleasant and mostly coherent: a calm green and cream palette, a good display font pairing (Manrope + DM Sans), and a soft illustrated hero. Everything after the landing page breaks down:

- The planner and admin screens look like an unstyled prototype.
- CSS from the Vite starter template still leaks into every page.
- Dark mode makes headlines invisible.
- The mobile navigation and mobile admin page are broken.
- The core journey (browse → add to plan) has no direct path.

Visual quality: **6/10 on the landing page, 3/10 elsewhere.** Usability: **4/10.**

**Biggest problems:**

1. **The "ghost text" headline is a dark-mode bug.** `index.css` from the Vite template switches heading colour to `#f3f4f6` when the OS is in dark mode, but the page background stays cream. The result is **1.05:1** contrast on the hero `<h1>` and the section `<h2>`. Typed search text becomes white on white (**1.03:1**), and the Login button turns grey on grey. (`index.css:20,33-51,69-74`)
2. **The navbar breaks on mobile once you're logged in.** The header has a fixed height, so the extra buttons wrap and overlap the logo and links. For admins, "My Visit Plans" is pushed off-screen. (`App.css:46-54`, `index.css:119-128`)
3. **There's no way to add a place to a plan from where you browse places.** Place cards have no actions. The user has to open "My Visit Plans" and remember the place's name from a dropdown. This is the app's core job. (`App.tsx:410-507`, `VisitPlans.tsx:469-483`)
4. **Planner cards collapse into a 140px column on desktop** when a place has no image, which is currently every place: the image column is still reserved, so the text lands in it. (`App.css:2079-2093`, `VisitPlans.tsx:650-659`)
5. **The admin dashboard renders 634px wide on a 375px phone.** Form fields are cut off on the right. (`index.css:53-63`, `AdminDashboard.css:2-7,175-177`)
6. **There's no account model in the UI.** There's no register screen and no logout, and the "Logged In" button reopens the login form. (`App.tsx:208-214`, `Login.tsx`)
7. **There's no router.** Every view is a state flag, so the browser Back button leaves the app, refresh returns to the home page, and nothing can be bookmarked or shared. (`App.tsx:71-73,143-171`)
8. **The CSS can't be maintained as it stands.** `App.css` defines `.place-card` **13 times**, uses **222 `!important`s**, **101 distinct hex colours**, ~29 font sizes and 13 radius values, and has 22 unused classes. Changing one thing reliably breaks another.

---

## 2. Navigation model, inventory and states

### 2.1 Navigation model (as built)

| View | How it's reached | Code |
|---|---|---|
| Home (hero, explore, about, footer) | Default render | `App.tsx:173-538` |
| Login | `showLogin` flag set by the nav button | `App.tsx:152-162`, `Login.tsx` |
| My Visit Plans | `showVisitPlans && loggedIn` | `App.tsx:165-171`, `VisitPlans.tsx` |
| Admin Dashboard | `showAdminDashboard && isAdmin` (role read from the JWT on the client) | `App.tsx:143-149`, `AdminDashboard.tsx` |
| In-page anchors | `#home`, `#explore`, `#about` hash links | `App.tsx:176-185,237-243` |

**What this means for users:**
- The URL never changes, so the browser Back button leaves SabaTrail entirely.
- Refreshing on the planner or admin page drops you back on the home page.
- Plans and places can't be shared or bookmarked.
- The hash links only work on the home view.
- The planner and admin views have **no global header or footer**. Their only way out is a "Back" button.

### 2.2 Component inventory

| Element | Variants found (each styled independently) |
|---|---|
| **Primary button** | `.primary-button` (hero, `App.css:165-185`), `.search-row button` (`:372-389`), `.auth-card form button` (`:739-764`), `.create-plan-form button` / `.add-place-form button` (`:1045-1055`, `:1562-1583`), `.admin-primary-button` (`AdminDashboard.css:89-93`). That's **5 versions**, with heights 44/46/48/49 px, radii 6/7/8/9 px, font sizes 13–18 px, and greens `#276b4b` / `#285b3c` / `#176b4b`. |
| **Secondary / outline button** | `.secondary-button`, `.login-button` (gets no background, so the browser's default grey shows on mobile and in dark mode), `.category-filter button`, `.auth-back-button`, `.admin-secondary-button`, `.remove-destination-button`, `.admin-row-actions button`. That's **7 versions**. |
| **Unstyled buttons** | `.back-button`, `.retry-button`, `.error-message`, `.success-message` are referenced in the TSX but **don't exist in any CSS file**, so they render with browser defaults (`VisitPlans.tsx:389,396,402`, `App.tsx:351`). |
| **Inputs** | Search (`App.css:355-370`), category select (3 duplicate copies), auth inputs (`:722-737`), planner inputs (`:1549-1560`), planner time input (4 copies), admin inputs (`AdminDashboard.css:122-135`). Border colours `#e0e4dc`, `#d0ded2`, `#d5dfd6`, `#cfdad2`. |
| **Cards** | Place card (13 definitions; the final one is `App.css:4770-4956`), planned destination card (5 definitions), itinerary summary (4), map section (4), admin panel/stat card, auth card, empty state. |
| **Other** | Navbar, footer, hero with CSS-drawn mountains, eyebrow labels, category pill and number badge, Leaflet map with numbered `divIcon` markers and a dashed polyline, admin stats cards, admin tab buttons (no tab semantics), admin tables. |
| **Modals** | None. Destructive confirmations use `window.confirm` (`VisitPlans.tsx:263-267`, `AdminDashboard.tsx:175-181,256-262`). |

### 2.3 States

| Screen | Loading | Empty | Error | Success | Notes |
|---|---|---|---|---|---|
| Explore grid | "Loading destinations..." text only, no spinner, no `aria-live` (`App.tsx:338-343`) | ✅ Two variants: no data vs. no match, plus a Clear Filters button (`App.tsx:360-391`) | Unstyled "Try again" button that reloads the whole page. The copy tells end users to "check that the **backend** is running" (`App.tsx:345-358`) | — | Screenshot `desktop-08-backend-down` |
| Planner | **No loading state.** Plans start as `[]`, so "You have no visit plans yet" flashes before the data arrives (`VisitPlans.tsx:89,440-441`) | Text only (`:440-441`, `:634-638`) | Plain unstyled text. **When the API is down it says "You have no visit plans yet"**, which is false, next to an error about *destinations* (`:121-137`) | Plain text "…created successfully", never clears | Screenshot `desktop-10-plans-backend-down` |
| Admin | ✅ "Loading management data..." (`AdminDashboard.tsx:327-328`) | ✅ "No destinations found." in the table | ✅ Styled red banner (`AdminDashboard.css:202-205`) | ✅ Styled green banner | The most complete set of states in the app |
| Login | Button label changes to "Logging in..." and the button is disabled | — | ✅ Inline `role="alert"` (`Login.tsx:169`) | Redirects home with no confirmation | No register link, no "forgot password" |
| Logged-in vs. out | The nav adds "My Visit Plans", "Admin Dashboard" and "Logged In". There's no greeting, no avatar and no logout. | | | | |

### 2.4 Design tokens actually in use

- **No CSS custom properties are used by the app.** The only tokens are the Vite template's (`index.css:1-16`): purple `--accent: #aa3bff`, `--text: #6b6375`, and so on. These are unrelated to the green brand, and they still affect the page through `h1`/`h2` colour and dark mode.
- **Colours:** 101 distinct hex values. There are 9 near-identical dark greens (`#173e2a`, `#19352b`, `#1b5037`, `#1d452d`, `#234b35`, `#234d35`, `#254b38`, `#294936`, `#285b3c`) and 4 primary greens (`#276b4b`, `#285b3c`, `#176b4b`, `#167d58`).
- **Fonts:** DM Sans (body) and Manrope (display), loaded with a render-blocking `@import` (`App.css:2`). The Vite template still sets `font: 18px/145% system-ui` on `:root` (`index.css:18`), so any element without an explicit size inherits **18px**. That's why the nav buttons render at 18px instead of the intended 14px.
- **Font sizes:** 9, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23, 24, 25, 27, 30, 32, 38, 39px, plus 7 different `clamp()` values.
- **Spacing (gap):** 4, 6, 7, 8, 9, 10, 12, 14, 16, 17, 18, 20, 24, 26, 28, 35, 38, 55, 60px.
- **Radii:** 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24px, 50%.
- **Shadows:** 14 distinct `box-shadow` values.
- **Breakpoints:** 1024, 800, 760, 700, 650, 600, 520, 480 and 420px (9 values). Some components switch at 650 and their neighbours at 700, so between 651 and 700px the cards are stacked but the filter is still inline.

---

## 3. Findings

Severity: **Critical** = broken or unusable for a class of users. **High** = major friction or a WCAG AA failure on core content. **Medium** = noticeable quality or usability cost. **Low** = polish.

### Critical

| # | Area | Finding | Location | Recommendation |
|---|---|---|---|---|
| C1 | Visual / A11y | **Dark-mode leak makes the headlines and search text invisible** (the "ghost text").<br>• `color-scheme: light dark` and a dark token block from the Vite template are still active.<br>• `h1`/`h2` use `color: var(--text-h)`, which becomes `#f3f4f6`, but the backgrounds are hard-coded cream. Hero `h1` = **1.05:1**, "Explore local destinations" = **1.02:1**.<br>• The search input sets no `color`, so typed text is white on `#fcfcfa` (**1.03:1**).<br>• `.login-button` sets no background, so it becomes dark grey with green text.<br>• Verified: `desktop-11-dark-mode`, `d-dark-hero`. | `index.css:1-51,69-74`; `App.css:95-102,355-365` | Delete `index.css:1-51` and `:98-111`. Set `color-scheme: light` in a new `:root` token block. Give `.hero h1` and `.section-heading h2` an explicit `color: var(--ink-900)`. Give every input `color` and `background`, and give `.login-button` `background: transparent`. |
| C2 | Responsive | **The logged-in nav overflows on mobile.**<br>• `.navbar` has a fixed `height: 86px` (74px below 800px).<br>• `.nav-actions` wraps (`index.css:124-128`), and the buttons inherit 18px text from `.nav-actions button { font: inherit }` (`index.css:119-122`), which beats `.login-button { font-size: 14px }`.<br>• At 375px as an admin, "Admin Dashboard" and "Logged In" overlap "Home" and "Explore Places", and "My Visit Plans" is pushed above the viewport.<br>• Verified: `m-nav-admin`. | `App.css:46-54,95-102,508-529`; `index.css:113-128` | Remove `height` and use `min-height: 64px` with `padding-block: 12px`. Delete the `index.css` nav rules. Below 768px, collapse the links and account actions into a menu button (≥44×44) that opens a sheet. Put the account actions in one "Account" menu: My plans · Admin · Log out. |
| C3 | Layout | **The planner card puts all the text in a 140px column** when a place has no image (which is every seeded place).<br>• The final grid is `30px 140px minmax(0,1fr)`, but the `<img>` is only rendered when an image exists, so `.planned-destination-details` auto-places into the 140px track. That leaves ~700px of empty card.<br>• Verified: `d-plans-3`. | `App.css:2079-2093`; `VisitPlans.tsx:650-659` | Always render the image slot, with a placeholder like the Explore card's. Or use `grid-template-areas: "order media details"` and give `.planned-destination-details` `grid-area: details`, so it can't drift into the image column. |
| C4 | Responsive | **The admin dashboard is 634px wide on a 375px phone.**<br>• `#root` is a flex column with `width: 1126px`, and `.admin-page` uses `margin: 0 auto`, so the page shrinks to fit its content.<br>• The table's `.admin-row-actions { white-space: nowrap }` then sets that width, and the form and stats are cut off on the right.<br>• The same shrink-to-fit makes the page width jump when switching admin tabs.<br>• Verified: `m-admin-1`. | `index.css:53-63`; `AdminDashboard.css:2-7,175-177` | Delete the template `#root` rules. Give `.admin-page` (and `.visit-plans-page`) `width: 100%` plus `max-width`. Below 650px, render the admin table rows as stacked cards. |

### High

| # | Area | Finding | Location | Recommendation |
|---|---|---|---|---|
| H1 | UX flow | **There's no "Add to plan" where users browse.** The journey Explore → add to plan → summary breaks: cards have no actions, and the planner makes you pick a place by name from an unfiltered `<select>` (recall over recognition). | `App.tsx:410-507`; `VisitPlans.tsx:469-483` | Add an "Add to my day" button on every card. If logged out, it opens login and resumes the add afterwards. If the user has several plans, show a small plan picker. Show a persistent "Your day: 3 stops" tray that links to the plan. |
| H2 | IA | **There's no logout and no register.**<br>• The "Logged In" button calls `setShowLogin(true)`, which reopens the login form.<br>• The login card has no "Create an account" link, even though the backend supports registration.<br>• A shared computer can't be signed out. | `App.tsx:208-214`; `Login.tsx:140-181` | Replace it with an account menu: name, My plans, Admin (if admin), **Log out** (clears `sabatrail_token`). Add a `/register` view and a "New here? Create an account" link under the Log In button. |
| H3 | IA | **No routing.** The Back button exits the app, refresh loses your place, and plans and places can't be linked. | `App.tsx:71-73,143-171` | Add `react-router` with routes `/`, `/places/:id`, `/plan/:id`, `/login`, `/register` and `/admin/{places,categories}`. Mark the active page in the nav with `aria-current="page"`. |
| H4 | Visual | **The Vite template's `#root` is still active.**<br>• `width: 1126px`, `text-align: center` and `border-inline: 1px solid` are applied to every page.<br>• The centring is why form labels sit centred above left-aligned inputs (admin, planner), why the hero text is centred while its buttons are left-aligned, and why there are two thin grey vertical lines on desktop.<br>• Verified: `desktop-04-home-user`, `d-admin-1`. | `index.css:53-63` | Delete the block. Set `text-align: start` and lay out each page with its own container: `.container { width: min(1180px, 100% - 2*var(--gutter)); margin-inline: auto }`. |
| H5 | A11y | **Body text below 4.5:1** (see §3.1). Hero paragraph 3.95, section intro 3.65, empty-state text 3.89, footer 3.62, hero note 3.93, eyebrow 4.23 (11px), the "S / 01" mark 2.63, and art-label captions 3.99 at **9px**. | `App.css:124-131,151-156,201-208,291-296,322-333,417-423,465-469` | Use one muted text colour, `#5f6b64` (5.33:1 on cream, 4.94:1 on `#f1f2eb`). Use `#3f6b4d` (5.88:1) for eyebrows. Raise the minimum text size to 12px, and the body minimum to 15–16px. |
| H6 | A11y | **Input borders fail the 3:1 non-text contrast rule (WCAG 1.4.11):** search 1.25:1, filter select 1.39:1, admin inputs 1.44:1. On white cards the fields are close to invisible. | `App.css:360,2233,3935,4217`; `AdminDashboard.css:129` | Use `#7d8c82` (3.53:1 on white) for input borders. Keep the pale `#dce8dd` for decorative card borders only. |
| H7 | Explore | **The catalogue is a single column of ~400px cards.**<br>• 12 places make a **6,895px** page on desktop and over 9,000px on mobile.<br>• Every card shows all 9 detail lines.<br>• The description is cut to 4 lines with no way to expand it (`App.css:3499-3505`, `!important`).<br>• The left/right alternation makes the eye zig-zag.<br>• Verified: `desktop-01-home`. | `App.css:4770-4956`; `App.tsx:442-505` | Use a responsive grid (`repeat(auto-fill, minmax(300px, 1fr))`, 24px gap on desktop, 16px on mobile). Each card shows a 4:3 image, category chip, name, a 2-line summary, and **distance · duration · hours** as icon metadata. Move the full details to `/places/:id`, with a map and "Before you go". |
| H8 | Planner | **The planner looks unfinished.**<br>• No app header; an unstyled browser-default "← Back" button (29px tall).<br>• An `h2` page title in DM Sans 500, with every heading and label centred (`App.css:1520-1524`).<br>• Error and success messages are unstyled text with no colour or icon.<br>• The create, select, add and summary steps are stacked with no visual grouping.<br>• Verified: `d-plans-1`, `m-plans-1`. | `VisitPlans.tsx:387-547`; `App.css:1511-1657` | Give it the app shell and an `h1` with the plan name and date. Use a two-column layout on desktop: **left**, an ordered stop timeline; **right**, a sticky summary and map. Move "Create plan" into a dialog or a "New plan" button next to the plan switcher. Style alerts with the admin banner styles (`AdminDashboard.css:190-205`). |
| H9 | Error recovery | **Misleading or generic errors.**<br>• With the API down, the planner says "You have no visit plans yet".<br>• Creating a plan without a date fails with "Unable to create the visit plan" (the UI marks the date optional, but the API requires it).<br>• The explore error tells visitors to check the *backend*. | `VisitPlans.tsx:121-137,180-210,422-429,440-441`; `App.tsx:97-99` | Track `loading`/`error` per request, and don't render empty states while an error is shown. Make the visit date `required`, defaulting to today. Use user-facing copy: "We couldn't reach SabaTrail. Check your connection and try again." with a retry that re-fetches rather than reloading the page. |
| H10 | Admin | **The place form is a flat grid of 15 fields** with centred labels, free-text times ("e.g. 08:00 AM"), and lat/long typed as raw numbers. There's no grouping, no help text and no image preview. A mistake is only reported after submit. | `AdminDashboard.tsx:334-527` | Group the fields into sections: **Basics** (name, category, description), **Location** (address, lat/long with a click-to-place map, auto-computed distance), **Visiting** (`type="time"` opening/closing, duration in minutes, best time), **Guidance** (suitability chips, facilities, tips), **Media** (URL with a live preview). Validate inline. Mark optional fields as optional rather than starring required ones. |

### Medium

| # | Area | Finding | Location | Recommendation |
|---|---|---|---|---|
| M1 | Interaction | **The "Search" button doesn't search.** It only focuses the input, because filtering already happens as you type. Users will click it and see nothing change. | `App.tsx:294-301` | Remove the button and show "12 results" live under the field, or make it submit and scroll to the results. |
| M2 | Interaction | **The category filter is a `<select>` with 6 options.** It hides the categories and takes two taps to change. | `App.tsx:305-335` | Use a horizontally scrolling row of toggle chips (All · Religious · Nature · Heritage · Recreation · Food · Useful) with `aria-pressed`. |
| M3 | Planner | **Every change to a planned-time input fires a PUT and a "Planned time updated." flash.** There's no debounce, and typing a time sends several requests. | `VisitPlans.tsx:318-341,692-701` | Save on `blur`, or debounce by 600ms. Show a small inline "Saved ✓" next to the field instead of a page-level message. |
| M4 | Planner | **The visit date is never shown.** It's collected at creation, but the plan picker and summary only show the name. | `VisitPlans.tsx:453-457,507-547` | Show "Sat 1 Nov 2026" under the plan title, and include it in the picker labels. |
| M5 | Planner | **The summary labels are confusing.** "Recorded Distance Total" adds up each place's distance *from Hemmathagama*, so the 29.6 km shown is meaningless as a trip distance. "Scheduled 2" is unclear. | `VisitPlans.tsx:511-546` | Until real routing exists, show "Stops 3 · Est. time at stops 2h · Time window 09:00–12:30". Remove the distance sum, or relabel it "Furthest stop: 10 km from town". |
| M6 | Planner | **There's no way to reorder stops** (the API supports it), and no way to rename or delete a plan. | `VisitPlans.tsx:641-713` | Add ↑/↓ buttons (keyboard-accessible) or drag handles. Add "Rename" and "Delete plan" to a plan menu. |
| M7 | Planner | **The description is clamped with `p:nth-of-type(3)`.** That only targets the description when both category and address exist; otherwise the clamp lands on another field. | `App.css:2136-2144,2203-2208` | Give the description a class (`.planned-destination-description`) and clamp that. |
| M8 | Admin | **Editing a category is fragile.** The inputs aren't inside the hidden `<form>`, so Enter does nothing. Save calls `requestSubmit()` on an empty form, and the buttons have no `type`. | `AdminDashboard.tsx:614-671` | Make each row a form (or use `form={id}` on the inputs). Add `type="button"`/`type="submit"`. Esc cancels. |
| M9 | Admin | **The tabs aren't tabs.** They're plain buttons with an `active` class, with no `role="tablist"`/`tab`/`aria-selected` and no arrow-key navigation. | `AdminDashboard.tsx:312-325` | Either make them real tabs (ARIA + roving tabindex) or, better, two routes: `/admin/places`, `/admin/categories`. |
| M10 | Admin | **The destinations table can't be searched, sorted or filtered,** and its only columns are Name, Category and Distance. The stats cards repeat counts that are already visible. | `AdminDashboard.tsx:298-307,538-572` | Add a search field, a category filter and a sortable name column. Add columns for "Has image" and "Updated". Replace the stats cards with data-health counts like "3 places missing images". |
| M11 | Destructive actions | **Destructive actions use `window.confirm`,** with no undo. A failed category delete shows the generic server error. | `VisitPlans.tsx:263-267`; `AdminDashboard.tsx:175-181,256-283` | Use a styled confirm dialog that names the item and its consequences ("Used by 2 places — reassign first"), or an "Undo" toast for removing a stop. |
| M12 | Typography | **Headings are inconsistent.** Hero and section headings use Manrope 800 at −2px tracking. The planner and admin headings fall back to the template's `h1`/`h2` (DM Sans 500, `#08060d`), and the auth heading uses a third style. | `index.css:69-93`; `App.css:133-145,694-700`; `AdminDashboard.css:21-24` | Define `--font-display` and apply it to all h1–h3 in one rule, with a single 6-step type scale (see §4). |
| M13 | Content | **Leftover template and filler content.**<br>• The page `<title>` is "frontend", and the favicon is the Vite one.<br>• The "S / 01" section mark means nothing.<br>• The hero's "status dot" suggests a live status.<br>• "Discover SabaTrail" and "About" duplicate each other, and the About section is one sentence. | `index.html:5,7`; `App.tsx:246-249,277,515-525` | Use the title "SabaTrail — Plan a day around Hemmathagama" and a custom favicon. Delete the section mark and status dot. Turn About into a 3-step "How it works" (Browse → Add stops → Follow your day). |
| M14 | A11y | **Loading and result-count changes aren't announced,** and the hero illustration puts `aria-label` on a plain `div` (it's ignored without a role). | `App.tsx:252-255,338-343,397-406` | Wrap the results summary in `aria-live="polite"` and give loading `role="status"`. Mark the art `aria-hidden="true"` (it's decorative). |
| M15 | Responsive | **Tap targets under 44px:** nav links 23–26px tall, "← Back" 29px, time inputs 37px, "Remove Destination" 39px, Leaflet zoom buttons 30px. "About" is hidden entirely below 520px. | `App.css:77-83,522-524,2157-2180`; measured on `mobile-*` | Give links and buttons `min-height: 44px` (with padding, not a larger font). Keep About available in the mobile menu. |

### Low

| # | Area | Finding | Location | Recommendation |
|---|---|---|---|---|
| L1 | Performance | The Google Fonts `@import` in CSS blocks rendering. | `App.css:2` | Move it to `<link rel="preconnect">` + `<link rel="stylesheet">` in `index.html`, or self-host with `font-display: swap`. |
| L2 | Motion | `scroll-behavior: smooth` and `scrollTo({behavior:"smooth"})` ignore `prefers-reduced-motion`. | `App.css:14`; `AdminDashboard.tsx:171` | Wrap them in `@media (prefers-reduced-motion: no-preference)`, and check the media query in JS. |
| L3 | Focus | There's no custom `:focus-visible` style anywhere. The search input removes its outline and uses a 9%-alpha ring (`#54826318`) that's barely visible; the border colour change (4.3:1) is what actually shows focus. | `App.css:362,367-370` | Add a global `:focus-visible { outline: 3px solid var(--green-700); outline-offset: 2px }` and remove `outline: none`. |
| L4 | Map | The map height is an inline `400px` plus a `!important` 320px override in **4 duplicate** blocks. Popup text is unstyled, and there's no "Open in Google Maps" link. | `VisitPlans.tsx:566-570`; `App.css:1299-1509` | Set the height in one CSS rule (`clamp(280px, 50vh, 460px)`). Add a "Get directions" link per stop. |
| L5 | Content | The placeholder copy "Image coming soon" appears on every card, and the ⌖ glyph as an icon renders inconsistently across fonts. | `App.tsx:426-429` | Use a category-specific illustration or colour block with the category icon. Drop the "coming soon" promise. |
| L6 | Visual | The hero illustration's back mountain sticks out past the viewport at 768px (`right=827`). The parent `overflow: hidden` clips it, but it's sloppy. | `App.css:247-254` | Use percentage offsets, or a single SVG illustration with `viewBox` scaling. |

### 3.1 Contrast table

All ratios calculated from the actual CSS values. AA requires 4.5:1 for body text and 3:1 for large text and UI parts.

| Pair | Ratio | Result |
|---|---|---|
| Dark-mode hero h1 `#f3f4f6` on `#fbfaf6` | **1.05** | ❌ Critical |
| Dark-mode search text `#fff` on `#fcfcfa` | **1.03** | ❌ Critical |
| Search input border `#e0e4dc` on `#fcfcfa` | 1.25 | ❌ (UI 3:1) |
| Filter select border `#d0ded2` on `#fff` | 1.39 | ❌ (UI 3:1) |
| Admin input border `#cfdad2` on `#fff` | 1.44 | ❌ (UI 3:1) |
| Section mark `#8a9a8c` on `#f1f2eb` (12px) | 2.63 | ❌ |
| Footer text `#7b867e` on `#fbfaf6` (12px) | 3.62 | ❌ |
| Section intro `#748078` on `#f1f2eb` (14px) | 3.65 | ❌ |
| Empty-state text `#748078` on `#f8f9f4` (13px) | 3.89 | ❌ |
| Hero note `#758078` on `#fbfaf6` (12px) | 3.93 | ❌ |
| Hero paragraph `#738078` on `#fbfaf6` (15px) | 3.95 | ❌ |
| Art-label caption `#6d8574` on `#fff` (**9px**) | 3.99 | ❌ |
| Eyebrow `#548263` on `#fbfaf6` (11px bold) | 4.23 | ❌ (small text) |
| Hero h1 accent `#548263` on `#fbfaf6` (≥38px) | 4.23 | ✅ large text |
| Nav links `#65736b` on `#fbfaf6` | 4.77 | ✅ |
| Itinerary note `#65736a` on `#fff` | 4.98 | ✅ |
| Primary button `#fff` on `#276b4b` | 6.38 | ✅ |
| Place detail / description `#526458` on `#fff` | 6.32 | ✅ |
| Remove button `#a13f35` on `#fff` | 6.41 | ✅ |
| Card title `#173e2a` on `#fff` | 11.94 | ✅ |
| Body `#19352b` on `#fbfaf6` | 12.68 | ✅ |

### 3.2 Things that work, with evidence

- **Primary green on white passes AA (6.38:1)**, and the card titles are strongly legible (11.94:1).
- **Images have alt text** (`App.tsx:418`, `VisitPlans.tsx:654`).
- **Every input has a label:** the in-page audit found 0 unlabelled controls on all screens. `Login.tsx:147-167` uses `htmlFor`/`id` correctly, with `autoComplete` set.
- **Login and planner messages are announced:** `role="alert"` / `role="status"` (`Login.tsx:169`, `VisitPlans.tsx:396,402`, `AdminDashboard.tsx:309-310`).
- **Explore empty states** separate "no data" from "no match" and offer Clear Filters (`App.tsx:360-391`).
- **The planner map** uses numbered markers that match the list order, auto-fits to the stops, and states plainly that the dashed line isn't a road route (`VisitPlans.tsx:60-86,625-628`).
- **Admin feedback banners** are the best-designed component in the app (`AdminDashboard.css:190-210`).
- **No horizontal page overflow on public screens** at 375, 768 or 1440px (measured `scrollWidth == innerWidth`). The only overflow is the admin page (C4).

---

## 4. Design system

Extract it from the best parts of the current CSS: the hero, the final Explore card, and the admin banners.

### 4.1 Tokens (put these in `src/styles/tokens.css`)

```css
:root {
  color-scheme: light;

  /* Colour: built from the existing greens, collapsed */
  --green-900: #173e2a;  /* headings, card titles (11.9:1 on white) */
  --green-700: #276b4b;  /* primary action, links, markers (6.4:1) */
  --green-800: #1b5037;  /* primary hover/pressed */
  --green-600: #3f6b4d;  /* eyebrows, accent text (5.9:1 on canvas) */
  --green-100: #e7f1e8;  /* chips, selected rows, placeholders */
  --sand-400:  #e4bc73;  /* the hero sun; use sparingly as the warm accent */

  --ink:        #19352b; /* body text */
  --ink-muted:  #5f6b64; /* secondary text (5.3:1 canvas, 4.9:1 canvas-alt) */
  --canvas:     #fbfaf6;
  --canvas-alt: #f1f2eb;
  --surface:    #ffffff;
  --border:        #dce8dd; /* decorative only */
  --border-strong: #7d8c82; /* inputs and controls (3.5:1) */

  --danger: #b42318;  --danger-bg: #fff0ee;
  --success:#176b3a;  --success-bg:#e8f7ed;
  --warning:#8a4b13;  --warning-bg:#fdf3e7;

  /* Type */
  --font-display: "Manrope", system-ui, sans-serif;
  --font-body: "DM Sans", system-ui, sans-serif;
  --text-xs: 0.75rem;   /* 12  captions, chips, never smaller */
  --text-sm: 0.875rem;  /* 14  meta, labels */
  --text-md: 1rem;      /* 16  body */
  --text-lg: 1.25rem;   /* 20  card titles */
  --text-xl: clamp(1.75rem, 3vw, 2.25rem);  /* 28-36 section h2 */
  --text-2xl: clamp(2.5rem, 4.5vw, 3.5rem); /* 40-56 page h1 */

  /* Space (4px base) */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px; --space-24: 96px;
  --gutter: clamp(16px, 4vw, 32px);
  --container: 1180px;

  /* Shape and elevation */
  --radius-sm: 6px;   /* inputs, small buttons */
  --radius-md: 10px;  /* buttons, images inside cards */
  --radius-lg: 16px;  /* cards, panels */
  --radius-pill: 999px;
  --shadow-sm: 0 2px 8px rgba(24, 58, 38, 0.06);
  --shadow-md: 0 8px 26px rgba(24, 58, 38, 0.08);

  /* Breakpoints (reference): 640 / 960 / 1200. Replaces the 9 current values. */
}
```

### 4.2 Component specs

- **Button.**
  - Size: `min-height: 44px` (48px for hero CTAs), `padding: 0 20px`, `border-radius: var(--radius-md)`, `font: 600 var(--text-sm)/1 var(--font-body)`.
  - Variants: **primary** (green-700 background, white text, green-800 on hover), **secondary** (surface background, 1px border-strong, green-700 text), **ghost** (transparent, green-700 text), **danger** (danger-bg background, danger text).
  - Disabled: `opacity: .55; cursor: not-allowed`. Focus: global `:focus-visible` ring.
  - One `<Button>` component replaces all 12 current variants.
- **Input / select / textarea.**
  - `min-height: 44px`, `padding: 10px 12px`, 1px `--border-strong`, `--radius-sm`, surface background, ink text.
  - Label above, left-aligned, `--text-sm` at weight 600. Help/error text below at `--text-xs`; errors use the danger colour plus an icon.
- **Card (place).**
  - Surface background, 1px `--border`, `--radius-lg`, `--shadow-sm`, rising to `--shadow-md` on hover.
  - Media 4:3 on top, content padding `--space-4`.
  - The meta row uses icons with `--text-sm` muted text.
- **Chip.** `--radius-pill`, `--text-xs` at 600, green-100 background, green-900 text; selected state is green-700 background with white text.
- **Alert / toast.** Reuse the admin banner styles (`AdminDashboard.css:190-205`) and tokenise them.
- **Page shell.** Header (64px min, sticky) + `<main>` container (`width: min(var(--container), 100% - 2*var(--gutter)); margin-inline: auto`) + footer, on every route.

### 4.3 Inconsistencies to eliminate

- Every hard-coded hex in `App.css` and `AdminDashboard.css`: replace with tokens (101 → about 20).
- 7 heading styles → one display rule.
- 5 primary button styles → one component.
- 4 input border colours → `--border-strong`.
- 13 radius values → 4.
- 14 shadows → 2.
- 9 breakpoints → 3.
- Centred form labels and headings in the planner and admin (inherited from `#root` and `App.css:1520-1524`) → left-aligned.

### 4.4 CSS to delete

**`index.css`:**
- Lines 1-51 (template tokens and dark mode).
- 53-63 (`#root` 1126px, centred, side borders).
- 69-93 (template `h1`/`h2`).
- 98-111 (`code`, `.counter`, unused).
- 113-128 (`.nav-actions` overrides that break the nav).

**`App.css`, unused classes (no TSX references):** `.visit-plans-header`, `.visit-plan-form-card`, `.visit-plans-back`, `.visit-plans-refresh`, `.saved-plans-section`, `.saved-plans-title`, `.saved-plans-list`, `.saved-plan-card`, `.saved-plan-label`, `.saved-plan-clickable`, `.open-plan-hint`, `.visit-plan-success`, `.visit-plan-error`, `.visit-plans-empty`, `.remove-place-button`, `.planned-destination-info`, `.destination-order`, `.itinerary-summary-item/-number/-label`, `.itinerary-warning`, `.itinerary-distance-note`. That covers lines ~808-1161, 1188-1215 and 1280-1285.

**`App.css`, overridden duplicates:**
- `.place-card` and its children: lines **598-668** and **2316-4769**. Keep only the intent of **4770-4956**, rewritten without `!important` (it has 222).
- `.category-filter`: 3 copies (2215-2309, 3912-3954, 4194-4236). Keep one.
- `.itinerary-summary`: 4 copies (1163-1297, 1585-1633). Keep one.
- `.itinerary-map-section` / `.itinerary-map` / `.sabatrail-numbered-marker`: 4 copies (1299-1509). Keep one.
- `.planned-destination-*`: 5 versions (1089-1161, 1659-2213). Keep one, fixed per C3.

**Result:** `App.css` should drop from 4,957 lines to roughly 900. Splitting it per component (`Nav.css`, `PlaceCard.css`, `Planner.css`, …) keeps it that way.

---

## 5. Redesign direction (the brief)

1. **"Your day, as a trail."** Make the numbered, dashed trail line the brand idea. It already exists on the planner map; use it everywhere:
   - numbered stop badges on cards and the timeline;
   - a trail rule as the section divider;
   - the S logo as a trail marker.

   Keep the green and cream palette but add the **sand** accent (`#e4bc73`, from the hero sun) for "added to your day" states. Replace the CSS-triangle hero with **real photography** of Hemmathagama, with a short trail line drawn over it. That's the step that makes it look local rather than templated.

2. **Browse compactly, read deeply.**
   - A 3/2/1-column grid of compact cards with **"Add to my day"** on every card.
   - Category chips plus live search above the grid.
   - Tapping a card opens **`/places/:id`**: hero image, key facts row (distance · duration · hours · best time), a "Before you go" block (dress, footwear, safety), facilities, and a mini map with a Directions link.
   - The long single-column feed goes away.

3. **A persistent "Your day" tray.** A sticky bottom bar on mobile, or a right rail on desktop, shows "3 stops · ~2h at stops · 09:00–12:30" from any page. It turns adding places into one motion instead of a detour through the planner.

4. **The planner as a timeline, not a set of forms.**
   - **Left:** a vertical timeline of stops. Each stop has its time, duration, ↑/↓ reorder, a remove action with Undo, and the drive gap between stops once routing exists.
   - **Right:** a sticky summary and map.
   - Plan switching, renaming and deleting live in the page header.
   - Creating a plan is a 2-field dialog with the date defaulting to today.

5. **Admin as a quiet working tool.**
   - A left sidebar (Places / Categories), and a dense, searchable, sortable table.
   - Rows open a **side drawer** with the sectioned form from H10, including a map pin picker and image preview.
   - Toasts for saves, and a styled confirm dialog that explains the consequences of deleting.
   - Same tokens, less decoration.

---

## 6. Prioritised action list

| Priority | Action | Files |
|---|---|---|
| **High** | Delete the Vite template CSS (`#root`, dark mode, `h1`/`h2`, nav overrides); add `tokens.css` with `color-scheme: light`; give inputs and buttons explicit colour and background. Fixes C1, H4 and parts of C2/C4. | `index.css`, new `styles/tokens.css`, `main.tsx` |
| **High** | Rebuild the navbar: no fixed height, a mobile menu, and an account menu with **Log out**. | `App.tsx:175-216`, `App.css:46-107,471-529` |
| **High** | Add `react-router` and an app shell (header/footer on every route); add `/register`; move Login, Plans and Admin to routes. | `main.tsx`, `App.tsx`, `Login.tsx`, new `Register.tsx`, new `Layout.tsx` |
| **High** | Fix the planner card grid (C3) and the admin mobile overflow (C4); make the admin table stack on mobile. | `App.css:2066-2213`, `AdminDashboard.css:2-7,152-188`, `VisitPlans.tsx:641-713` |
| **High** | Add "Add to my day" on place cards, with a resume-after-login flow. | `App.tsx:410-507`, `VisitPlans.tsx` (extract the plan API into a hook) |
| **High** | Fix contrast: muted text → `#5f6b64`, eyebrows → `#3f6b4d`, input borders → `#7d8c82`, minimum text 12px. | `App.css` (lines listed in §3.1), `AdminDashboard.css:129` |
| **High** | Planner states: real loading, error-aware empty states, user-facing error copy, date required (default today). | `VisitPlans.tsx:89-210,395-461`, `App.tsx:95-99,345-358` |
| **Medium** | Collapse `App.css` to one rule set per component (§4.4) and split per component; remove all `!important`. | `App.css` → `components/*.css` |
| **Medium** | Explore: responsive grid of compact cards, category chips, remove the fake Search button, `aria-live` results count, a `/places/:id` details page. | `App.tsx:269-513`, new `PlaceDetails.tsx` |
| **Medium** | Planner: timeline layout, reorder controls, show the visit date, debounced time saves, clearer summary labels, rename/delete plan. | `VisitPlans.tsx`, `App.css:1511-2213` |
| **Medium** | Admin: sectioned form with `type="time"`, map pin picker and image preview; real tabs or routes; fix the category edit form; table search and sort; a confirm dialog. | `AdminDashboard.tsx`, `AdminDashboard.css` |
| **Medium** | One shared `<Button>`, `<Field>`, `<Alert>` and `<Card>` set, used by all screens. | new `components/ui/*` |
| **Low** | Global `:focus-visible`; respect `prefers-reduced-motion`; mark the hero art `aria-hidden`; 44px tap targets. | `App.css:14,362`, `App.tsx:252-255`, `AdminDashboard.tsx:171` |
| **Low** | Page `<title>`, favicon, remove "S / 01" and the status dot; rewrite About as "How it works"; load fonts with `<link>`. | `index.html`, `App.tsx:246-249,277,515-525`, `App.css:2` |
| **Low** | Map: CSS-controlled height, styled popups, a "Get directions" link per stop. | `VisitPlans.tsx:549-629`, `App.css:1299-1509` |
