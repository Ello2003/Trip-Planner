/** Persistent UI preferences (localStorage) — survive navigation and reloads */

export type GlobalUiPrefs = {
  activeDashTab?: 'trips' | 'charts';
  activeTripId?: string | null;
  activeTripTab?: string;
};

export type TripUiPrefs = {
  researchView?: 'both' | 'list' | 'map';
  planViewMode?: 'both' | 'timeline' | 'map';
  showMapBanner?: boolean;
  timelineCollapsed?: boolean;
  planCollapsedSheets?: Record<string, boolean>;
  researchCollapsedSheets?: Record<string, boolean>;
  researchExpandedMaps?: Record<string, boolean>;
};

const GLOBAL_KEY = 'travel-ledger-ui-global-v1';
const tripKey = (tripId: string) => `travel-ledger-ui-trip-v1:${tripId}`;

function readJson<T extends object>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null || raw === '') return { ...fallback };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...fallback };
    return { ...fallback, ...parsed } as T;
  } catch {
    return { ...fallback };
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

export function loadGlobalUi(): GlobalUiPrefs {
  return readJson<GlobalUiPrefs>(GLOBAL_KEY, {});
}

export function saveGlobalUi(patch: Partial<GlobalUiPrefs>): void {
  writeJson(GLOBAL_KEY, { ...loadGlobalUi(), ...patch });
}

export function loadTripUi(tripId: string): TripUiPrefs {
  if (!tripId) return {};
  return readJson<TripUiPrefs>(tripKey(tripId), {});
}

/** Merge-patch trip UI prefs and write immediately (safe to call from event handlers). */
export function saveTripUi(tripId: string, patch: Partial<TripUiPrefs>): void {
  if (!tripId) return;
  writeJson(tripKey(tripId), { ...loadTripUi(tripId), ...patch });
}
