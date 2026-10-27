# Currency Converter & Multi-Currency Tracking Utility

## Overview
Added a currency converter utility and multi-currency tracking system to Travel Ledger, enabling travellers to record expenses and itinerary plan items in foreign destination currencies while tracking exchange rates and automatically normalizing totals into their home currency.

## Key Features Implemented

1. **Currency Utility & Live Exchange Rates (`src/utils/currency.ts`)**:
   - 25 major world currencies supported with symbols, flags, codes, and typical exchange rates.
   - Live exchange rate fetching via Open Exchange Rates API with automatic fallbacks to reliable preset rates.
   - Bi-directional conversion utilities (`convertCurrency`, `getDefaultExchangeRate`, `formatCurrencyAmount`).

2. **Data Model Enhancements (`src/types.ts`)**:
   - Extended `Trip` with `homeCurrency` and `defaultExpenseCurrency`.
   - Extended `Settings` with default `homeCurrency`.
   - Extended `Expense`, `ManualEstimate`, and `PlanItem` with:
     - `currency`: Foreign expense currency (e.g. `EUR`, `JPY`, `USD`).
     - `originalCost`: The amount in foreign currency.
     - `exchangeRate`: The conversion rate (`1 foreign = X home`).
     - `homeCurrency`: The user's home currency at the time of conversion.
   - Normalized `unitCost` / `cost` kept in the trip's home currency so all existing summaries, charts, budget totals, and exports remain 100% accurate.

3. **Standalone Currency Converter Modal (`src/components/CurrencyConverterModal.tsx`)**:
   - Quick interactive conversion calculator with real-time rate updates and currency flip `⇄`.
   - Live rate fetcher with manual rate override capability.
   - Pocket cheat sheet / quick denomination reference (1, 5, 10, 20, 50, 100, 200, 500 units).
   - "Save as Trip Default" and "Save as Global Default" actions.

4. **In-Modal Currency Conversion (`src/components/Modals.tsx`)**:
   - `TripModal`: Home currency and destination currency pickers for trip setup and editing.
   - `ExpenseModal`: "Convert from Foreign Currency" toggle with live calculation and exchange rate lock.
   - `AddEstimateModal`: Multi-currency converter toggle and original foreign cost tracking.
   - `PlanItemModal`: Currency picker, foreign amount input, and exchange rate recording.

5. **Visual Ledger Badges & Quick Access**:
   - `BudgetTab`: Currency conversion badges in both Estimated Costs and Actual Expenses tables (`€120.00 (@0.855)`).
   - `PlanTab`: Currency badges in plan items table with hover tooltip detailing exact conversion formula.
   - Quick-launch `💱 Currency` buttons in Header, Trip Details toolbar, Budget table toolbar, and Plan table toolbar.

## Verification
- Clean TypeScript linting (`tsc --noEmit` passed with 0 errors).
- Clean production build compilation (`compile_applet` passed).
