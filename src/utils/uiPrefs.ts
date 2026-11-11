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

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null || raw === '') return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
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
  const next = { ...loadGlobalUi(), ...patch };
  writeJson(GLOBAL_KEY, next);
}

export function loadTripUi(tripId: string): TripUiPrefs {
  if (!tripId) return {};
  return readJson<TripUiPrefs>(tripKey(tripId), {});
}

export function saveTripUi(tripId: string, patch: Partial<TripUiPrefs>): void {
  if (!tripId) return;
  const next = { ...loadTripUi(tripId), ...patch };
  writeJson(tripKey(tripId), next);
}
