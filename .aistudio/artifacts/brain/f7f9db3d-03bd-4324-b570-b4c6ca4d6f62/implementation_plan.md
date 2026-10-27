# Implementation Plan: Cloud Firestore Persistence, Luxury Heritage Aesthetic & Curated Travel Manifests

Elevate the Travel Ledger into a bespoke, cloud-synchronized travel companion with real-time Firestore persistence, an elevated luxury heritage ledger aesthetic (vellum parchment, brass foiling, perforated boarding pass cards), and high-detail travel tracking inspired by the depth of bespoke wardrobe and humidor logs (attire ensemble planning, luggage manifests, and travel lounge/haul logs).

---

## User Review Required

> [!IMPORTANT]
> **Firebase Setup Flow**:
> In accordance with the `firebase-integration-rpc` guidelines, setting up Firestore requires calling `show_aistudio_ui(ui_type: "firebase_setup")` so you can review and accept the Firebase terms in the AI Studio interface. Once accepted, we verify via `GetFirebaseTos` and call `ProvisionFirebase`.

---

## Proposed Changes

### 1. Database & Persistence Layer (`firebase-integration-rpc`)
- **Intermediate Representation (`firebase-blueprint.json`)**:
  - Define entities: `Trip` (expanded with attire, haul logs, and luggage manifests), `Expense`, `ItineraryPlan`, `ResearchItem`, `PackingItem`, `LuggageBag`, `TravelOutfit`, and `TravelHaulItem`.
  - Secure path definitions under `/users/{userId}/trips/{tripId}` with strict schema validation.
- **Security Rules (`firestore.rules`)**:
  - Implement zero-trust ABAC rules: user isolation (`request.auth.uid == userId`), strict key enforcement, string length and regex constraints, immutable timestamps (`createdAt`, `updatedAt`), and verified auth enforcement.
- **Firebase Initialization & Error Handling**:
  - `src/lib/firebase.ts`: Initialize app, Firestore (`getFirestore(app, config.firestoreDatabaseId)`), and Auth.
  - `src/utils/firestoreErrors.ts`: Conformance with `handleFirestoreError(error, operationType, path)` formatting.
  - `src/context/FirebaseContext.tsx`: Real-time listener (`onSnapshot`) with optimistic local updates, seamless fallback to offline demo data, and Google Sign-in popup.
  - Top-bar sync status indicator showing real-time Cloud Firestore connection status ("Synced to Cloud", "Syncing...", "Offline Cache").

### 2. High-Detail Travel Modules (Attire Manifest & Lounge/Hauls)
*Note: Purely travel-focused, but providing the tactile depth and item-level curation seen in bespoke tracking apps.*
- **Travel Luggage & Attire Manifest** (inside Trip Detail -> new **Attire & Bags** tab + enhanced Packing):
  - **Bags & Weight Tracker**: Register baggage pieces (e.g. "Rimowa Cabin", "Mulberry Garment Bag", "Tumi Backpack") with airline weight limits and total weight calculated.
  - **Travel Outfit & Ensemble Builder**: Plan day-by-day outfits for specific trip activities (e.g. "Day 1 Dinner at Le Gabriel", "Day 2 Walking Tour & Lounges", "Day 3 Gala Reception"), tagging garment items, footwear, time-of-day, and weather suitability.
  - **Item Condition & Laundry State**: Mark packed garments as *Fresh*, *Worn*, or *Laundry Sent*, ensuring garments are ready for return travel.
- **Travel Lounge & Hauls Diary** (inside Trip Detail -> new **Hauls & Lounges** tab):
  - **Travel Hauls & Purchases**: Log specialty acquisitions made while travelling (e.g. bespoke tailoring hauls, regional cigars/wines/perfumes, duty-free allowances), tracking merchant, format/spec, acquisition price, currency, and customs duty limits.
  - **Lounge & Tasting Journal**: Log visits to memorable travel lounges, wine bars, or bespoke salons with venue rating, pairings, notes, and photos/stamps.

### 3. Luxury Heritage Aesthetic Overhaul
- **Visual Polish**:
  - Refined paper palette: warm vellum background (`#f4efe2`), rich ink (`#19222c`), burnished brass accents (`#b8874f`, `#936a38`), subtle parchment grain, and deep leather-bound border accents.
  - Boarding pass cards with realistic perforated tear-off ticket stubs, airport IATA code badges (e.g. `LHR -> ATH`), and embossed vintage visa stamps.
  - Fine-ruled ledger tables with brass dividers, serif typography headers, and crisp monospaced numerals.
  - Polished KPI board with burnished brass trim, tactile status indicators, and smooth micro-animations.

### 4. Version History Tracking
- **Version History System**:
  - Maintain `src/constants/version.ts` with current version and changelog entries.
  - Create `CHANGELOG.md` documenting v1.1.0 changes: Cloud Firestore persistence, luxury heritage aesthetic, travel luggage/attire manifest, and travel lounge/haul diary.
  - Header / Footer version modal accessible to view revision history directly in the app.

---

## Verification Plan

### Automated Verification
- `compile_applet`: Verify clean TypeScript compilation with Vite bundle build.
- `lint_applet`: Verify ESLint passes without errors or unused imports.
- `firestore.rules`: Validate syntax and ensure ESLint rules check passes.

### Manual Verification Flow
1. **Firestore Connectivity**:
   - Verify connection probe `getDocFromServer(doc(db, 'test', 'connection'))` passes without offline errors.
   - Test creating, editing, and deleting a trip; verify real-time snapshot listener syncs data instantly.
2. **Attire & Luggage Manifest**:
   - Navigate to a trip -> Attire & Bags tab.
   - Add a luggage piece (e.g., "Carry-on Roller") with weight limit.
   - Create a travel outfit ensemble (e.g., "Evening Suit & Oxfords") and assign to Day 2.
   - Toggle garment status from "Fresh" to "Worn".
3. **Travel Hauls & Lounge Diary**:
   - Navigate to Hauls & Lounges tab.
   - Add a specialty haul (e.g., "Davidoff No. 2 Box - London duty-free") and verify duty-free allowance meter updates.
   - Add a lounge review (e.g., "The Churchill Bar") with rating and tasting notes.
4. **Visual & Print Integrity**:
   - Inspect boarding pass ticket styling, brass borders, and typography.
   - Test Print / Export itinerary to ensure print stylesheet remains crisp and beautifully formatted.
5. **Version History Modal**:
   - Click the version badge in the masthead or footer to verify the changelog popup renders latest updates.
