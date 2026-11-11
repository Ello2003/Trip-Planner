# Changelog & Version History

All notable changes to the **Travel Ledger** project are documented here.

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
