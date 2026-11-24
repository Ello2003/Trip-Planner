# Changelog & Version History

All notable changes to the **Travel Ledger** project are documented here.

---

## [1.25.8] - 2026-11-24

### Changed
- fix: reliable map geocoding (retries, batch, persist lat/lng)
- fix: map geocoding retries, full queue, persist coordinates
- Plan: drag category sections + quick hide/collapse like Research Touched: CI workflows, Maintenance scripts, ResearchMap.tsx, TripMap.tsx, Types / app version, geocodePlace.ts.

---

## [1.25.7] - 2026-11-17

### Changed
- Finished applying the corrected **1.25.x** release history (documents / IndexedDB, Notes cleanup, PDF viewer, version tooling).

---


## [1.25.6] - 2026-11-17

### Changed
- Auto version bumps now write **detailed notes** from recent commits and the areas of the app that changed.
- In-app and markdown changelog entries for **1.25.0–1.25.5** filled in with real feature descriptions (no more “Auto bump after …” placeholders).

---


## [1.25.5] - 2026-11-17

### Added
- **IndexedDB document store** for Budget and Notes uploads (about 40 MB per file).
- Automatic **migration** of older base64 uploads into IndexedDB.

### Changed
- Trip JSON / localStorage keeps **file metadata only** (name, size, type) so saves stay small.
- Open and Download load the binary from IndexedDB (or legacy data / cloud URL when present).

---


## [1.25.4] - 2026-11-17

### Changed
- Notes collapse/remove preferences and related styling follow-up after the Notes redesign.

---


## [1.25.3] - 2026-11-17

### Changed
- Notes typography cleaned up; emoji / icon-only actions replaced with text controls.
- Journal, Links, and Documents sections can be **collapsed** or **removed** (and restored) per trip.

### Removed
- **Geo-pins** and **practicality** blocks from Notes for existing and new trips.

---


## [1.25.2] - 2026-11-17

### Changed
- **Open** on PDF uploads uses the browser PDF viewer in a new tab (blob URL).
- Images and text open in-browser; **Download** remains available for every file.

---


## [1.25.1] - 2026-11-17

### Added
- Shared **bump_version** script and CI workflow so each main change can ship with a version and changelog entry.

---


## [1.25.0] - 2026-11-17

### Added
- **Document uploads** on Budget and Notes (PDF, images, office files; stored with the trip).
- **Drag-and-drop** for Research category sections.
- **By time / Manual** timeline sort control on Plan (persisted).
- **Inline star ratings** on Plan items when Research has no priority.
- **Persistent UI state**: collapsed sections, research/plan views, open trip and tab.

### Changed
- Hour-by-hour timeline only lists items that have a **time** set (no default clock time).
- Tab bar filters unknown/disabled tabs; Notes tab fully wired; mobile bottom nav matches desktop visibility.

### Fixed
- Timeline sort was forced to Manual on every load.
- Orphan / duplicate tab keys from older saves.

---

## [1.24.0] - 2026-11-11

### Added
- **Mobile bottom tab navigation** for an app-like trip experience without changing desktop layout.
- **Drag-and-drop reordering** (Plan timeline, Research tables, Packing) via @dnd-kit, replacing up/down buttons.
- **Single-click inline title editing** for sheet/section names.
- **Quick promote from Research**: `+` adds to Plan with existing data and no modal; stays on Research.
- **↩ Plan** control on Research (same arrow icon as Plan’s Move to Research) opens the full Plan edit form.
- **Star priority on Plan items**: Research priority (★–★★★★★) is copied on promote and shown under the name in the Plan table and timeline; retained when moving back to Research.

### Fixed
- Plan timeline titles no longer clip on narrow mobile widths.
- Promoting to Plan no longer switches away from the Research tab.
- Research rows again show links and notes under name/address.

---

## [1.15.0] - 2026-10-25

### Added
- **Interactive Google Maps Component in TripDetailView**:
  - Integrated `@vis.gl/react-google-maps` with modern `AdvancedMarkerElement` pins and anchored `InfoWindow` cards.
  - Automatically plots all trip `planItems` locations with intelligent Places API (New) geocoding and fallback coordination.
  - Flexible view switching directly within Plan tab (`🔀 Map & Timeline`, `📋 Timeline Only`, `🗺️ Map Only`) plus a header toolbar toggle (`🗺️ Itinerary Map`).
  - Interactive day-by-day and category sheet filters, auto-centering (`Fit Bounds`), and quick itinerary carousel.
  - Full synchronization with user's configured `mapsApiKey` from settings and fallback to environment key.

---

## [1.14.0] - 2026-10-24


### Added
- **Cloud Firestore Persistence**: Provisioned backend database with real-time multi-device synchronization, offline cache support, and zero data loss.
- **Google Cloud Auth**: Added one-click Google Sign-in to protect ledger data across devices and browsers.
- **Travel Luggage & Attire Manifest (`AttireTab`)**:
  - Registered baggage piece tracker with airline allowance thresholds and total weight calculations.
  - Curated Day-by-day and occasion ensemble planner (pieces, footwear, weather suitability, worn state).
  - Garment care and laundry transit tracker (Fresh, Worn, Laundry Sent).
- **Travel Lounge & Specialty Hauls Diary (`HaulsTab`)**:
  - Specialty acquisitions manifest for travel purchases (cigars, tailoring hauls, spirits, perfumery, leather goods).
  - Customs duty-free allowance monitor for tobacco, spirits, and luxury items.
  - Travel lounge and tasting room journal with star ratings, pairings, and atmosphere notes.
- **Luxury Heritage Aesthetic Polish**:
  - Warm parchment vellum card backgrounds with burnished brass foil borders (`--brass: #b8874f`).
  - Realistic perforated boarding pass cards with departure/arrival tags, barcodes, and manifest badges.
  - Burnished brass KPI board highlights with inset metallic foil trim.
- **In-App Version History**:
  - Interactive version badge and footer link opening the detailed Changelog modal.

---

## [1.13.4] - Previous Release
- An Actual row that is still blank no longer overwrites user edits to its description, category or quantity: it follows the estimate only until you change it yourself.

## [1.13.3]
- Fixed spinner arrows on Qty / Unit Cost fields so column-resize hit area does not capture button presses.

## [1.13.2]
- Quantity and unit-cost spinner arrows now work repeatedly without losing table focus.

## [1.13.1]
- Shared decimal number helpers across Estimated, Actual, and Visited tables.

## [1.13.0]
- Automatic matching Actual Expense row creation for every planned cost.

## [1.12.0]
- Applied London trip layout as the shared default across trips.
