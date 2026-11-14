from pathlib import Path
import re

# ---- TripDetailView ----
p = Path('src/components/TripDetailView.tsx')
t = p.read_text()

# Imports
if "from './NotesTab'" not in t:
    t = t.replace(
        "import { HaulsTab } from './HaulsTab';",
        "import { HaulsTab } from './HaulsTab';\nimport { NotesTab } from './NotesTab';\nimport { MobileBottomTabs } from './MobileBottomTabs';",
        1,
    )
    print('imports')

# Known tab keys + visibleTabs filter
old_vis = '''  const disabledTabsSet = new Set(settings.disabledTabs || ['attire', 'hauls']);
  const visibleTabs = (settings.tripTabOrder || []).filter(k => !disabledTabsSet.has(k));'''
new_vis = '''  const KNOWN_TABS = new Set(['budget', 'charts', 'plan', 'research', 'notes', 'posttrip', 'packing', 'attire', 'hauls']);
  const disabledTabsSet = new Set(settings.disabledTabs || ['attire', 'hauls']);
  // Only real modules, enabled, unique — drops orphans / duplicates left in saved order
  const visibleTabs = Array.from(
    new Set((settings.tripTabOrder || []).filter(k => KNOWN_TABS.has(k) && !disabledTabsSet.has(k)))
  );'''
if old_vis in t:
    t = t.replace(old_vis, new_vis, 1)
    print('visibleTabs')
elif 'KNOWN_TABS' in t:
    print('visibleTabs already')
else:
    print('visibleTabs WARN')

# Notes label in renderTabButton
if "key === 'notes'" not in t:
    t = t.replace(
        '''    if (key === 'posttrip') {
      label = 'Visited';
      const visitedCount = trip.planItems.filter(p => p.visited).length;
      if (visitedCount) count = ` (${visitedCount})`;
    }''',
        '''    if (key === 'notes') {
      label = 'Notes';
    }
    if (key === 'posttrip') {
      label = 'Visited';
      const visitedCount = trip.planItems.filter(p => p.visited).length;
      if (visitedCount) count = ` (${visitedCount})`;
    }''',
        1,
    )
    print('notes label')

# Render Notes tab content before packing
if "activeTripTab === 'notes'" not in t:
    t = t.replace(
        '''      {activeTripTab === 'packing' && (
        <PackingTab
          trip={trip}
          onUpdateTrip={onUpdateTrip}
          onOpenAddPackingModal={onOpenAddPackingModal}
          onShowToast={onShowToast}
        />
      )}
    </main>''',
        '''      {activeTripTab === 'notes' && (
        <NotesTab trip={trip} onUpdateTrip={onUpdateTrip} onShowToast={onShowToast} />
      )}

      {activeTripTab === 'packing' && (
        <PackingTab
          trip={trip}
          onUpdateTrip={onUpdateTrip}
          onOpenAddPackingModal={onOpenAddPackingModal}
          onShowToast={onShowToast}
        />
      )}

      <MobileBottomTabs tabs={visibleTabs} active={activeTripTab} onChange={setActiveTripTab} />
    </main>''',
        1,
    )
    print('notes + mobile tabs')
elif 'MobileBottomTabs' not in t:
    t = t.replace(
        '    </main>\n  );\n};',
        '      <MobileBottomTabs tabs={visibleTabs} active={activeTripTab} onChange={setActiveTripTab} />\n    </main>\n  );\n};',
        1,
    )
    print('mobile tabs only')
else:
    print('notes/mobile already')

# Gate disabled panel content (safety)
# attire/hauls already only when active; if disabled they shouldn't be active due to effect

p.write_text(t)

# ---- storage: dedupe tripTabOrder ----
sp = Path('src/utils/storage.ts')
s = sp.read_text()
old_s = '''  sDefaults.tripTabOrder.forEach(key => {
    if (!state.settings.tripTabOrder.includes(key)) state.settings.tripTabOrder.push(key);
  });'''
new_s = '''  sDefaults.tripTabOrder.forEach(key => {
    if (!state.settings.tripTabOrder.includes(key)) state.settings.tripTabOrder.push(key);
  });
  // Drop unknown keys and duplicates from older saves
  const known = new Set(sDefaults.tripTabOrder);
  const seen = new Set<string>();
  state.settings.tripTabOrder = state.settings.tripTabOrder.filter(k => {
    if (!known.has(k) || seen.has(k)) return false;
    seen.add(k);
    return true;
  });'''
if 'Drop unknown keys and duplicates' not in s:
    if old_s in s:
        s = s.replace(old_s, new_s, 1)
        sp.write_text(s)
        print('storage dedupe')
    else:
        print('storage WARN')
else:
    print('storage already')

# ---- ReorderTabs: notes description ----
mp = Path('src/components/Modals.tsx')
m = mp.read_text()
if "notes: '" not in m and 'notes:' not in m[m.find('TAB_DESCRIPTIONS'):m.find('TAB_DESCRIPTIONS')+800]:
    m = m.replace(
        "packing: 'Packing lists and baggage essentials tracker',",
        "notes: 'Journal, web clips, geo-pins and practical trip info',\n    packing: 'Packing lists and baggage essentials tracker',",
        1,
    )
    mp.write_text(m)
    print('reorder notes desc')
else:
    print('reorder desc ok')

print('done')
