# Research Section Google Maps Integration

## Overview
Added an interactive Google Maps component for the Research tab (`ResearchMap.tsx`), matching the look, feel, and capabilities of the Itinerary Map while providing specialized features for place discovery, category filtering, and trip planning.

## Key Features Implemented

1. **Interactive Google Maps Component (`src/components/ResearchMap.tsx`)**:
   - Built with `@vis.gl/react-google-maps` using `APIProvider`, `Map`, `AdvancedMarker`, `Pin`, and `InfoWindow`.
   - Supports map modes: Roadmap, Terrain, and Satellite/Hybrid.
   - Dynamic Places API geocoder (`PlacesResearchResolver`) that automatically resolves coordinates for researched places based on address/name and destination.
   - Organic cluster fallback based on destination center if coordinates are unlisted.

2. **Category / Sheet Filter Bar ("so they the categories are ok the map")**:
   - **All Categories Pill**: Displays the grand total of places plotted.
   - **Per-Category Sheet Pills**: Shows each category (e.g. Dining, Sights, Lodging, Culture, Shopping) with its distinctive color dot (`sheet.color`), category title, and the number of places in that category.
   - Clicking any category instantly filters pins on the map to show only places in that category.
   - **Status Filter**: Filter by All, Shortlisted (⭐), or Researching (🔍).
   - **Priority Filter**: Filter by All Ratings, Must-Visit (★★★★★), Top-Rated (★★★★+), or Recommended (★★★+).

3. **Advanced Pin & Marker Styling**:
   - Pins styled with the exact category color tag.
   - Badged with category initial or special star/checkmark glyphs.
   - Selection highlighting with scale zoom and camera pan.

4. **Rich InfoWindows with Direct Actions**:
   - Category badge with color swatch.
   - Price level indicators (`£`, `££`, `£££`, `££££`) and priority ratings (`★`).
   - Estimated cost display.
   - Address with "Open in Google Maps ↗" deep-link.
   - Notes snippet and web links.
   - **"✈️ Promote to Plan"** action button: Directly converts a researched spot into a scheduled itinerary plan item.
   - **"⭐ Shortlist"** toggle button: Marks or unmarks items for quick access.
   - **"✎ Edit"** and **"✕ Delete"** actions.

5. **Research Tab View Modes (`src/components/ResearchTab.tsx`)**:
   - **Split View (Default)**: Displays the interactive map prominently above the categorized list.
   - **List Only**: Traditional heritage ledger view of categorized research cards.
   - **Map Only**: Full-width interactive map for visual geographic exploration.
   - Expand / Collapse map height toggle.
   - Direct button to Map Settings / API Key modal.

6. **Version History**:
   - Bumped to `v1.16.0` in `package.json`, `src/types.ts`, and added changelog entry in `CHANGELOG`.
