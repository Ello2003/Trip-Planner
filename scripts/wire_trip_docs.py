from pathlib import Path

# types.ts — TripDoc + documents on Trip
tp = Path('src/types.ts')
t = tp.read_text()
if 'export interface TripDoc' not in t:
    t = t.replace(
        '''export interface TripNotesData {
  entries: NoteEntry[];
  clips: WebClip[];
  pins: GeoPin[];
  practical: TripPractical;
  legacyMigrated?: boolean;
}

export interface Trip {''',
        '''export interface TripNotesData {
  entries: NoteEntry[];
  clips: WebClip[];
  pins: GeoPin[];
  practical: TripPractical;
  legacyMigrated?: boolean;
}

/** Uploaded file attached to Budget or Notes for a trip */
export interface TripDoc {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  section: 'budget' | 'notes';
  /** data URL (base64) — kept with trip data for offline access */
  dataUrl: string;
  createdAt: number;
}

export interface Trip {''',
        1,
    )
    t = t.replace(
        '  tripNotes?: TripNotesData;\n  expenses: Expense[];',
        '  tripNotes?: TripNotesData;\n  documents?: TripDoc[];\n  expenses: Expense[];',
        1,
    )
    tp.write_text(t)
    print('types')
else:
    print('types already')

# storage migrate
sp = Path('src/utils/storage.ts')
s = sp.read_text()
if 't.documents' not in s and 'documents' not in s[s.find('forEach((t: Trip)'):s.find('forEach((t: Trip)')+800]:
    # after packingList default
    if 'if (!Array.isArray(t.packingList)) t.packingList = [];' in s:
        s = s.replace(
            'if (!Array.isArray(t.packingList)) t.packingList = [];',
            'if (!Array.isArray(t.packingList)) t.packingList = [];\n    if (!Array.isArray(t.documents)) t.documents = [];',
            1,
        )
        sp.write_text(s)
        print('storage')
    else:
        print('storage WARN')
else:
    print('storage already')

# BudgetTab — import + panel before closing
bp = Path('src/components/BudgetTab.tsx')
b = bp.read_text()
if 'TripDocumentsPanel' not in b:
    b = b.replace(
        "import { formatCurrencyAmount } from '../utils/currency';",
        "import { formatCurrencyAmount } from '../utils/currency';\nimport { TripDocumentsPanel } from './TripDocumentsPanel';",
        1,
    )
    # insert before final closing of main return - after Notes Card
    old = '''      {/* Notes Card */}
      <div className="chart-card">
        <h3>Notes</h3>
        <textarea
          className="notes-box"
          placeholder="Itinerary notes, daily spending caps, reminders…"
          value={trip.notes || ''}
          onChange={e =>
            onUpdateTrip({
              ...trip,
              notes: e.target.value,
              updatedAt: Date.now()
            })
          }
        />
      </div>
    </div>
  );
};'''
    new = '''      {/* Notes Card */}
      <div className="chart-card">
        <h3>Notes</h3>
        <textarea
          className="notes-box"
          placeholder="Itinerary notes, daily spending caps, reminders…"
          value={trip.notes || ''}
          onChange={e =>
            onUpdateTrip({
              ...trip,
              notes: e.target.value,
              updatedAt: Date.now()
            })
          }
        />
      </div>

      <TripDocumentsPanel
        trip={trip}
        section="budget"
        onUpdateTrip={onUpdateTrip}
        title="Budget documents"
      />
    </div>
  );
};'''
    if old in b:
        b = b.replace(old, new, 1)
        print('budget')
    else:
        # try without special ellipsis
        if 'className="notes-box"' in b and 'TripDocumentsPanel' not in b:
            b = b.replace(
                '    </div>\n  );\n};',
                '''      <TripDocumentsPanel\n        trip={trip}\n        section="budget"\n        onUpdateTrip={onUpdateTrip}\n        title="Budget documents"\n      />\n    </div>\n  );\n};''',
                1,
            )
            print('budget alt')
        else:
            print('budget WARN')
    bp.write_text(b)
else:
    print('budget already')

# NotesTab
np = Path('src/components/NotesTab.tsx')
n = np.read_text()
if 'TripDocumentsPanel' not in n:
    # add import at top after helpers import
    if "from '../utils/helpers'" in n:
        n = n.replace(
            "from '../utils/helpers';",
            "from '../utils/helpers';\nimport { TripDocumentsPanel } from './TripDocumentsPanel';",
            1,
        )
    old = '''  return (
    <div className="notes-tab">
      <JournalSection notes={notes} save={save} toast={onShowToast} />
      <ClipsSection notes={notes} save={save} toast={onShowToast} />
      <PinsSection notes={notes} save={save} toast={onShowToast} tripName={trip.name} />
      <PracticalSection notes={notes} save={save} currencyHint={trip.defaultExpenseCurrency || ''} />
    </div>
  );
};'''
    new = '''  return (
    <div className="notes-tab">
      <TripDocumentsPanel
        trip={trip}
        section="notes"
        onUpdateTrip={onUpdateTrip}
        onShowToast={onShowToast}
        title="Trip documents"
      />
      <JournalSection notes={notes} save={save} toast={onShowToast} />
      <ClipsSection notes={notes} save={save} toast={onShowToast} />
      <PinsSection notes={notes} save={save} toast={onShowToast} tripName={trip.name} />
      <PracticalSection notes={notes} save={save} currencyHint={trip.defaultExpenseCurrency || ''} />
    </div>
  );
};'''
    if old in n:
        n = n.replace(old, new, 1)
        print('notes')
    else:
        print('notes WARN')
    np.write_text(n)
else:
    print('notes already')

print('done')
