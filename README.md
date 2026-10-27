# Travel Ledger

A tactile, vintage-styled travel ledger, budget planner, expense log, and itinerary organizer built with React, TypeScript, and Vite.

## Features

- **Boarding Pass Dashboard**: Visual boarding-pass trip cards with perforation effects, barcode lines, progress bars, countdowns, and country flags.
- **Budget & Actual Expenses**:
  - Live Planned Estimates and Manual Estimates table with inline editing, per-row reset, and live total recalculations.
  - Actual Expenses table with live amount calculation, planned-vs-actual comparison, and category tracking.
  - Interactive category breakdown donut chart.
  - Google My Maps embedding per trip.
- **Hour-by-Hour Itinerary (Plan Tab)**:
  - Calendar dates or day-numbered timeline modes.
  - Drag-and-drop / arrow reordering with manual ordering support.
  - Categorized sheet tables (Hotels, Restaurants, Cheap Eats, Bars, Coffee Shops, Activities, Sights, Things To Do, Transport / Transfers).
  - Multi-link support per item.
  - Printable itinerary (PDF export).
- **Candidate Places (Research Tab)**:
  - Place research with status tagging (Researching, Shortlisted, Dismissed, Promoted).
  - Price levels, priority stars, and estimated costs.
  - One-click promotion to Plan.
  - Section-specific Google Maps embed toggles.
  - Interactive Google Maps place view when an API key is provided.
- **Visited Tracker**:
  - Direct bridge between itinerary plan and actual expenditure.
- **Packing Checklist**:
  - Categorized checklist with progress indicators and "Quick Add Essentials" starter pack.
- **Data Protection & Sync**:
  - Session Undo / Redo (40-step stack with `Ctrl+Z` / `Ctrl+Shift+Z` support).
  - Rolling daily backup history (14-day snapshots).
  - Export & Import JSON backups.
  - Two-way GitHub Sync (Push & Pull) with personal access token and conflict detection.
  - Trash can with 90-day retention and restore functionality.
