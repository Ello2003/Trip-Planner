import { AppState, Category, Sheet, Settings, Trip, PlanItem, ManualEstimate, Expense, HistoryEntry, SHEET_TO_CAT } from '../types';
import { uid, guessCountryFromName, daysBetweenDateKeys, addDaysToDateKey } from './helpers';

export const STORAGE_KEY = 'trips-data';
export const HISTORY_KEY = 'trips-data-history';
export const MAX_HISTORY_DAYS = 14;

export function defaultCategories(): Category[] {
  return [
    { name: 'Flights', color: '#b8874f' },
    { name: 'Hotels', color: '#35695c' },
    { name: 'Transportation', color: '#35597a' },
    { name: 'Food & Drink', color: '#a63a2e' },
    { name: 'Shopping', color: '#6a4a6e' },
    { name: 'Spends', color: '#9c5a3f' },
    { name: 'Excursions', color: '#4a8a86' },
    { name: 'Misc', color: '#8a7a3a' },
    { name: 'Other', color: '#5b6672' }
  ];
}

export function defaultSheets(): Sheet[] {
  return [
    { key: 'Hotels', color: '#35695c' },
    { key: 'Restaurants', color: '#8a7a3a' },
    { key: 'Cheap Eats', color: '#b8874f' },
    { key: 'Bars', color: '#6a4a6e' },
    { key: 'Coffee Shops', color: '#9c6b3f' },
    { key: 'Activities', color: '#35597a' },
    { key: 'Sights', color: '#4a8a86' },
    { key: 'Things To Do', color: '#9c5a3f' },
    { key: 'Transport / Transfers', color: '#5b6672' }
  ];
}

export function defaultSettings(): Settings {
  return {
    mapsApiKey: '',
    githubEnabled: false,
    githubToken: '',
    githubOwner: '',
    githubRepo: '',
    githubPath: 'data.json',
    githubBranch: 'main',
    githubSha: null,
    githubLastSyncAt: null,
    tripTabOrder: ['budget', 'charts', 'plan', 'research', 'posttrip', 'packing', 'attire', 'hauls'],
    disabledTabs: ['attire', 'hauls']
  };
}

export function resolveExpenseCategory(name: string, categories: Category[]): string {
  return categories.some(c => c.name === name) ? name : 'Other';
}

export function estimateOwners(t: Trip, categories: Category[]) {
  const owners: {
    o: PlanItem | ManualEstimate;
    kind: 'plan' | 'manual';
    name: string;
    category: string;
    quantity: number;
    unit: number;
    visited: boolean;
  }[] = [];

  (t.planItems || []).forEach(i => {
    if (i.cost == null) return;
    owners.push({
      o: i,
      kind: 'plan',
      name: i.name,
      category: i.estimateCategory || resolveExpenseCategory(SHEET_TO_CAT[i.sheet] || 'Other', categories),
      quantity: i.estimateQuantity == null ? 1 : i.estimateQuantity,
      unit: Number(i.cost) || 0,
      visited: !!i.visited
    });
  });

  (t.manualEstimates || []).forEach(m => {
    owners.push({
      o: m,
      kind: 'manual',
      name: m.description,
      category: m.category,
      quantity: m.quantity == null ? 1 : m.quantity,
      unit: Number(m.unitCost) || 0,
      visited: false
    });
  });

  return owners;
}

export function syncActualRows(t: Trip, categories: Category[]): boolean {
  let changed = false;
  estimateOwners(t, categories).forEach(x => {
    const o = x.o as any;
    let e = o.actualExpenseId ? t.expenses.find(z => z.id === o.actualExpenseId) : null;
    if (!e && !o.actualExpenseId && o.linkedExpenseId) {
      e = t.expenses.find(z => z.id === o.linkedExpenseId);
    }
    if (!e) {
      if (o.actualExpenseId || o.actualSkipped) return;
      const qty = Math.max(0, Number(x.quantity) || 0);
      const newExp: Expense = {
        id: uid('exp'),
        description: x.name,
        category: x.category,
        quantity: qty,
        unitCost: x.visited ? x.unit : null
      };
      t.expenses.push(newExp);
      o.actualExpenseId = newExp.id;
      changed = true;
      return;
    }
    if (!o.actualExpenseId) {
      o.actualExpenseId = e.id;
      changed = true;
    }
    if (e.unitCost == null && e.mirror !== false) {
      const qty = Math.max(0, Number(x.quantity) || 0);
      if (e.description !== x.name) {
        e.description = x.name;
        changed = true;
      }
      if (e.category !== x.category) {
        e.category = x.category;
        changed = true;
      }
      if (Number(e.quantity) !== qty) {
        e.quantity = qty;
        changed = true;
      }
    }
  });
  return changed;
}

export function removeBlankActual(t: Trip, owner: { actualExpenseId?: string | null }) {
  if (!owner || !owner.actualExpenseId) return;
  const e = t.expenses.find(x => x.id === owner.actualExpenseId);
  if (e && e.unitCost == null) {
    t.expenses = t.expenses.filter(x => x.id !== e.id);
  }
}

export function ensureActualExpense(t: Trip, item: PlanItem, categories: Category[], allowZeroCost = false): Expense | null {
  if (!item) return null;
  if (!allowZeroCost && (item.cost == null || Number(item.cost) <= 0)) return null;
  const category = item.estimateCategory || resolveExpenseCategory(SHEET_TO_CAT[item.sheet] || 'Other', categories);
  const quantity = Math.max(0, Number(item.estimateQuantity == null ? 1 : item.estimateQuantity) || 0);
  let expense = item.actualExpenseId ? t.expenses.find(e => e.id === item.actualExpenseId) : null;
  if (!expense) {
    expense = {
      id: uid('exp'),
      description: item.name,
      category,
      quantity,
      unitCost: Math.max(0, Number(item.cost) || 0)
    };
    t.expenses.push(expense);
    item.actualExpenseId = expense.id;
  } else if (expense.unitCost == null && item.cost != null) {
    expense.category = category;
    expense.quantity = quantity;
    expense.unitCost = Math.max(0, Number(item.cost) || 0);
  }
  return expense;
}

export function migrateState(state: any): AppState {
  if (!state.categories || !state.categories.length) state.categories = defaultCategories();
  ['Food & Drink', 'Shopping'].forEach(name => {
    if (!state.categories.some((c: Category) => c.name === name)) {
      const src = defaultCategories().find(c => c.name === name);
      if (src) state.categories.push({ name, color: src.color });
    }
  });

  if (!Array.isArray(state.sheets) || !state.sheets.length) state.sheets = defaultSheets();
  defaultSheets().forEach(s => {
    if (!state.sheets.some((x: Sheet) => x.key === s.key)) state.sheets.push(s);
  });

  if (!state.trash) state.trash = { trips: [], expenses: [] };
  if (!state.trash.trips) state.trash.trips = [];
  if (!state.trash.expenses) state.trash.expenses = [];
  if (!state.activityLog) state.activityLog = [];
  if (!state.settings) state.settings = defaultSettings();

  const sDefaults = defaultSettings();
  Object.keys(sDefaults).forEach(k => {
    if ((state.settings as any)[k] === undefined) (state.settings as any)[k] = (sDefaults as any)[k];
  });
  if (!Array.isArray(state.settings.tripTabOrder)) {
    state.settings.tripTabOrder = sDefaults.tripTabOrder.slice();
  }
  sDefaults.tripTabOrder.forEach(key => {
    if (!state.settings.tripTabOrder.includes(key)) state.settings.tripTabOrder.push(key);
  });
  if (!Array.isArray(state.settings.disabledTabs)) {
    state.settings.disabledTabs = ['attire', 'hauls'];
  }

  (state.trips || []).forEach((t: Trip) => {
    if (t.travelers == null) t.travelers = 2;
    if (t.startDate === undefined) t.startDate = null;
    if (t.endDate === undefined) t.endDate = null;
    if (t.notes === undefined) t.notes = '';
    if (!Array.isArray(t.planItems)) t.planItems = [];
    if (t.timelineMode === undefined || t.timelineMode === null) t.timelineMode = 'days';
    t.timelineMode = 'days';
    t.timelineManualOrder = true;
    if (!Array.isArray(t.research)) t.research = [];
    if (!Array.isArray(t.packingList)) t.packingList = [];
    if (!Array.isArray(t.luggageBags)) t.luggageBags = [];
    if (!Array.isArray(t.outfits)) t.outfits = [];
    if (!Array.isArray(t.hauls)) t.hauls = [];
    if (!Array.isArray(t.loungeVisits)) t.loungeVisits = [];

    // Seed default sample attire and haul records for London 2026 trip if not present
    if (t.name.toLowerCase().includes('london') && t.year === 2026) {
      if (t.luggageBags.length === 0) {
        t.luggageBags = [
          {
            id: uid('bag'),
            name: 'Rimowa Essential Cabin (Matte Black)',
            type: 'carry_on',
            colorTag: '#b8874f',
            maxWeightKg: 10,
            currentWeightKg: 8.4,
            notes: 'Overhead cabin compliant, TSA combination lock'
          },
          {
            id: uid('bag'),
            name: 'Bennett Winch Leather Weekender',
            type: 'checked',
            colorTag: '#35597a',
            maxWeightKg: 15,
            currentWeightKg: 11.2,
            notes: 'Tuscan leather holdall with garment compartment'
          }
        ];
      }
      if (t.outfits.length === 0) {
        t.outfits = [
          {
            id: uid('outfit'),
            dayNumber: 1,
            timeOfDay: 'evening',
            occasion: 'Dinner at Bancone & Soho Lounges',
            footwear: 'Edward Green Dark Oak Oxfords',
            weatherNote: 'Mild evening 18°C',
            wornStatus: 'worn',
            notes: 'Formal smart attire',
            pieces: [
              { id: uid('pc'), name: 'Suit Supply Navy Wool Blazer', type: 'jacket' },
              { id: uid('pc'), name: 'Cavour Linen Trousers', type: 'trousers' },
              { id: uid('pc'), name: 'Thomas Mason White Poplin Shirt', type: 'top' },
              { id: uid('pc'), name: 'Cartier Gold Ring', type: 'accessory' }
            ]
          },
          {
            id: uid('outfit'),
            dayNumber: 2,
            timeOfDay: 'day',
            occasion: 'Savile Row, Burlington Arcade & St. James Visit',
            footwear: 'Baudoin & Lange Suede Loafers',
            weatherNote: 'Daytime 21°C',
            wornStatus: 'planned',
            notes: 'Tailoring fittings and cigar sampling',
            pieces: [
              { id: uid('pc'), name: 'Knitted Merino Polo Shirt', type: 'top' },
              { id: uid('pc'), name: 'Tailored Beige Chinos', type: 'trousers' },
              { id: uid('pc'), name: 'Shoe Horn in day bag', type: 'accessory' }
            ]
          }
        ];
      }
      if (t.hauls.length === 0) {
        t.hauls = [
          {
            id: uid('haul'),
            name: 'Davidoff Signature No. 2 Tubos (Pack of 4)',
            category: 'cigars',
            merchant: 'Davidoff of London - St. James',
            formatOrSpec: 'Panetela 6 x 38',
            quantity: 4,
            unitPrice: 27.75,
            currency: '£',
            dutyFreeCategory: 'tobacco',
            notes: 'Smooth Dominican blend, cedar and floral notes',
            dateAcquired: '2026-08-04'
          },
          {
            id: uid('haul'),
            name: 'Suit Supply Havana Navy Wool Blazer',
            category: 'tailoring',
            merchant: 'Suit Supply Vigo Street',
            formatOrSpec: 'Size 40R / Italian Wool',
            quantity: 1,
            unitPrice: 379.00,
            currency: '£',
            dutyFreeCategory: 'goods',
            notes: 'Unstructured shoulder, patch pockets',
            dateAcquired: '2026-08-04'
          }
        ];
      }
      if (t.loungeVisits.length === 0) {
        t.loungeVisits = [
          {
            id: uid('lng'),
            venueName: 'Davidoff of London Sampling Lounge',
            city: 'St. James, London',
            date: '2026-08-04',
            rating: 5,
            pairingOrSelection: 'Davidoff Signature No. 2 with Double Espresso',
            atmosphereNotes: 'Masterfully curated humidor room. Warm hospitality from Eddie Sahakian.',
            isPrivateOrMembersClub: false
          },
          {
            id: uid('lng'),
            venueName: 'The Churchill Bar & Terrace',
            city: 'Portman Square, London',
            date: '2026-08-04',
            rating: 5,
            pairingOrSelection: 'Winston Churchill Late Hour + Smoked Old Fashioned',
            atmosphereNotes: 'Refined heated terrace with bespoke cigar service.',
            isPrivateOrMembersClub: true
          }
        ];
      }
    }
    if (t.country === undefined) t.country = '';
    if (t.countryGuessed === undefined) t.countryGuessed = false;
    if (t.mapEmbedUrl === undefined) {
      t.mapEmbedUrl = /london/i.test(t.name)
        ? 'https://www.google.com/maps/d/embed?mid=1agtFV4DvC-eE9MuhqqB5i3a2XWuJ0e4&hl=en&ehbc=2E312F'
        : '';
    }
    if (!Array.isArray(t.manualEstimates)) t.manualEstimates = [];
    t.manualEstimates.forEach((m: any) => {
      if (m.description === undefined) {
        m.description = m.name || 'Estimate';
        m.quantity = 1;
        m.unitCost = m.cost != null ? m.cost : 0;
        delete m.name;
        delete m.cost;
      }
    });
    if (!Array.isArray(t.hiddenSheets)) t.hiddenSheets = [];
    if (!t.sectionMapUrls || typeof t.sectionMapUrls !== 'object') t.sectionMapUrls = {};
    if (!t.country) {
      const guess = guessCountryFromName(t.name);
      if (guess) {
        t.country = guess;
        t.countryGuessed = true;
      }
    }
    t.planItems.forEach((i: any) => {
      if (t.startDate) {
        if (i.dayNumber == null && i.date) {
          const diff = daysBetweenDateKeys(i.date, t.startDate);
          if (Number.isFinite(diff) && diff >= 0) i.dayNumber = diff + 1;
        }
        if (i.dayNumber != null && Number.isFinite(Number(i.dayNumber))) {
          i.date = addDaysToDateKey(t.startDate, Number(i.dayNumber) - 1) || i.date;
        }
        if (i.dayNumberEnd != null && Number.isFinite(Number(i.dayNumberEnd))) {
          i.endDate = addDaysToDateKey(t.startDate, Number(i.dayNumberEnd) - 1) || i.endDate;
        }
        if (i.time && i.dayNumber == null && !i.date) {
          i.dayNumber = 1;
          i.date = t.startDate;
        }
        if (i.dayNumberEnd != null && !i.endDate) {
          i.endDate = addDaysToDateKey(t.startDate, Number(i.dayNumberEnd) - 1) || i.endDate;
        }
        if (i.endDate && i.dayNumberEnd == null) {
          const diff = daysBetweenDateKeys(i.endDate, t.startDate);
          if (Number.isFinite(diff) && diff >= 0) i.dayNumberEnd = diff + 1;
        }
      }
      if (i.estimateQuantity === undefined) i.estimateQuantity = 1;
      if (i.sheet === 'Activities / Sights') i.sheet = 'Activities';
      if (!i.estimateCategory) i.estimateCategory = resolveExpenseCategory(SHEET_TO_CAT[i.sheet] || 'Other', state.categories);
      if (!i.estimateOriginal) {
        i.estimateOriginal = { name: i.name, sheet: i.sheet, category: i.estimateCategory, quantity: i.estimateQuantity, cost: i.cost };
      }
      if (!Array.isArray(i.links)) {
        i.links = i.link ? [{ id: uid('link'), label: '', url: i.link }] : [];
        delete i.link;
      }
      if (i.visited === undefined) i.visited = false;
      if (i.actualExpenseId === undefined) i.actualExpenseId = null;
      if (i.actualNotes === undefined) i.actualNotes = '';
      if (i.actualRating === undefined) i.actualRating = null;
    });

    t.expenses.forEach(e => {
      if (e.notes === undefined) e.notes = '';
      if (e.rating === undefined) e.rating = null;
      const item = t.planItems.find(p => p.actualExpenseId === e.id || p.linkedExpenseId === e.id);
      if (item) {
        if (e.notes === '' && item.actualNotes) e.notes = item.actualNotes;
        if (e.rating == null && item.actualRating != null) e.rating = item.actualRating;
      }
    });

    syncActualRows(t, state.categories);

    t.research.forEach((i: any) => {
      if (i.sheet === 'Activities / Sights') i.sheet = 'Activities';
      if (!Array.isArray(i.links)) {
        i.links = i.link ? [{ id: uid('link'), label: '', url: i.link }] : [];
        delete i.link;
      }
    });
  });

  const trashCutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  state.trash.trips = state.trash.trips.filter((x: any) => !x.deletedAt || x.deletedAt >= trashCutoff);
  state.trash.expenses = state.trash.expenses.filter((x: any) => !x.deletedAt || x.deletedAt >= trashCutoff);

  return state as AppState;
}

export function defaultSeedState(): AppState {
  return {
    categories: defaultCategories(),
    sheets: defaultSheets(),
    trips: [],
    trash: { trips: [], expenses: [] },
    activityLog: [{ id: uid('log'), ts: Date.now(), action: 'setup', detail: 'Ledger initialised' }],
    settings: defaultSettings()
  };
}

export async function loadInitialState(): Promise<AppState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return migrateState(parsed);
    }
  } catch (e) {
    console.warn('Could not read from localStorage', e);
  }

  // Fallback: try to fetch from data.json (which contains the repo's real initial trips!)
  try {
    const res = await fetch('/data.json');
    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.trips)) {
        const state = {
          categories: json.categories || defaultCategories(),
          sheets: json.sheets || defaultSheets(),
          trips: json.trips,
          trash: json.trash || { trips: [], expenses: [] },
          activityLog: json.activityLog || [{ id: uid('log'), ts: Date.now(), action: 'setup', detail: 'Loaded initial data from data.json' }],
          settings: json.settings || defaultSettings()
        };
        const migrated = migrateState(state);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        } catch (_) {}
        return migrated;
      }
    }
  } catch (err) {
    console.warn('Failed to load /data.json', err);
  }

  return defaultSeedState();
}

export function saveStateToLocalStorage(state: AppState): boolean {
  try {
    const payload = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, payload);
    return localStorage.getItem(STORAGE_KEY) === payload;
  } catch (e) {
    console.error('Storage save error', e);
    return false;
  }
}

export function snapshotHistory(state: AppState) {
  try {
    const dateKey = new Date().toISOString().slice(0, 10);
    let history: HistoryEntry[] = [];
    try {
      history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch (_) {
      history = [];
    }
    const syncable = {
      categories: state.categories,
      sheets: state.sheets,
      trips: state.trips,
      trash: state.trash,
      activityLog: state.activityLog
    };
    const snapshot = JSON.stringify(syncable);
    const idx = history.findIndex(h => h.dateKey === dateKey);
    if (idx >= 0) {
      history[idx] = { dateKey, timestamp: Date.now(), snapshot };
    } else {
      history.push({ dateKey, timestamp: Date.now(), snapshot });
    }
    history.sort((a, b) => a.timestamp - b.timestamp);
    if (history.length > MAX_HISTORY_DAYS) {
      history = history.slice(history.length - MAX_HISTORY_DAYS);
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (_) {}
}

export function loadHistory(): HistoryEntry[] {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(history) ? history.sort((a, b) => b.timestamp - a.timestamp) : [];
  } catch (_) {
    return [];
  }
}
