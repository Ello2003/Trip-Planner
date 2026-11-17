from pathlib import Path
import re

# types — extend TripDoc
tp = Path('src/types.ts')
t = tp.read_text()
old = '''export interface TripDoc {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  section: 'budget' | 'notes';
  /** data URL (base64) — kept with trip data for offline access */
  dataUrl: string;
  createdAt: number;
}'''
new = '''export interface TripDoc {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  section: 'budget' | 'notes';
  /** IndexedDB key for the binary (usually same as id) */
  blobId?: string;
  /** @deprecated Legacy inline base64 — migrated to IndexedDB then stripped */
  dataUrl?: string;
  /** Optional Firebase Storage (or other) download URL for cross-device access */
  cloudUrl?: string;
  /** Internal: trip id used when migrating legacy blobs */
  tripIdHint?: string;
  createdAt: number;
}'''
if old in t:
    t = t.replace(old, new, 1)
    tp.write_text(t)
    print('types')
elif 'blobId?:' in t:
    print('types already')
else:
    # looser
    t2 = re.sub(
        r'export interface TripDoc \{[\s\S]*?\n\}',
        new,
        t,
        count=1,
    )
    if t2 != t:
        tp.write_text(t2)
        print('types re')
    else:
        print('types WARN')

# storage — slim documents on save
sp = Path('src/utils/storage.ts')
s = sp.read_text()
if 'slimDocumentsForPersist' not in s:
    if "from './helpers'" in s or 'from \'./helpers\'' in s:
        s = s.replace(
            "import { uid, guessCountryFromName, daysBetweenDateKeys, addDaysToDateKey, emptyTripNotes } from './helpers';",
            "import { uid, guessCountryFromName, daysBetweenDateKeys, addDaysToDateKey, emptyTripNotes } from './helpers';\nimport { slimDocumentsForPersist } from './docStore';",
            1,
        )
    # wrap saveStateToLocalStorage
    old_save = '''export function saveStateToLocalStorage(state: AppState): boolean {
  try {
    const payload = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, payload);
    return localStorage.getItem(STORAGE_KEY) === payload;'''
    new_save = '''export function saveStateToLocalStorage(state: AppState): boolean {
  try {
    // Strip document payloads — binaries live in IndexedDB
    const slim: AppState = {
      ...state,
      trips: (state.trips || []).map(tr => ({
        ...tr,
        documents: slimDocumentsForPersist(tr.documents)
      }))
    };
    const payload = JSON.stringify(slim);
    localStorage.setItem(STORAGE_KEY, payload);
    return localStorage.getItem(STORAGE_KEY) === payload;'''
    if old_save in s:
        s = s.replace(old_save, new_save, 1)
        print('save slim')
    else:
        print('save WARN')
    sp.write_text(s)
else:
    print('storage already')

print('done')
