from pathlib import Path

# --- ResearchTab ---
rp = Path('src/components/ResearchTab.tsx')
r = rp.read_text()

# Normalize: replace any existing prefs effects + toggleSheet with final version
import re

# Remove prior harden/persist blocks we may have inserted
r = re.sub(
    r"\n  // Re-load when switching trips[\s\S]*?const toggleSheet = \(key: string\) => \{[\s\S]*?\n  \};",
    "\n  const toggleSheet = (key: string) => {\n    setCollapsedSheets(prev => ({ ...prev, [key]: !prev[key] }));\n  };",
    r,
    count=1,
)

r = re.sub(
    r"\n  useEffect\(\(\) => \{\n    saveTripUi\(trip\.id, \{\n      researchView,[\s\S]*?\}, \[trip\.id, researchView, collapsedSheets, expandedSectionMaps\]\);\n\n  const toggleSheet",
    "\n  const toggleSheet",
    r,
    count=1,
)

# Insert clean rehydrate + toggles with immediate save
anchor = '  const toggleSheet = (key: string) => {\n    setCollapsedSheets(prev => ({ ...prev, [key]: !prev[key] }));\n  };'
replacement = '''  // Restore prefs when opening this trip (and after navigation back)
  useEffect(() => {
    const p = loadTripUi(trip.id);
    setResearchView(p.researchView || 'both');
    setCollapsedSheets(p.researchCollapsedSheets || {});
    setExpandedSectionMaps(p.researchExpandedMaps || {});
  }, [trip.id]);

  const toggleSheet = (key: string) => {
    setCollapsedSheets(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveTripUi(trip.id, { researchCollapsedSheets: next });
      return next;
    });
  };'''

if anchor in r:
    r = r.replace(anchor, replacement, 1)
    print('Research toggles')
else:
    print('Research anchor missing')

# researchView buttons: wrap by replacing setResearchView('both') etc with helpers
if 'const setResearchViewPersist' not in r:
    r = r.replace(
        replacement,
        replacement + '''

  const setResearchViewPersist = (v: 'both' | 'list' | 'map') => {
    setResearchView(v);
    saveTripUi(trip.id, { researchView: v });
  };''',
        1,
    )
    r = r.replace("onClick={() => setResearchView('both')}", "onClick={() => setResearchViewPersist('both')}")
    r = r.replace("onClick={() => setResearchView('list')}", "onClick={() => setResearchViewPersist('list')}")
    r = r.replace("onClick={() => setResearchView('map')}", "onClick={() => setResearchViewPersist('map')}")
    print('Research view persist')

# section maps
old_map = 'const toggleSectionMap = (key: string) => {\n    setExpandedSectionMaps(prev => ({ ...prev, [key]: !prev[key] }));\n  };'
new_map = '''const toggleSectionMap = (key: string) => {
    setExpandedSectionMaps(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveTripUi(trip.id, { researchExpandedMaps: next });
      return next;
    });
  };'''
if old_map in r:
    r = r.replace(old_map, new_map, 1)
    print('Research maps')
elif 'researchExpandedMaps: next' in r:
    print('Research maps ok')

rp.write_text(r)

# --- PlanTab ---
pp = Path('src/components/PlanTab.tsx')
p = pp.read_text()

p = re.sub(
    r"\n  useEffect\(\(\) => \{\n    const pref = loadTripUi\(trip\.id\);[\s\S]*?const toggleSheet = \(key: string\) => \{[\s\S]*?\n  \};",
    "\n  const toggleSheet = (key: string) => {\n    setCollapsedSheets(prev => ({ ...prev, [key]: !prev[key] }));\n  };",
    p,
    count=1,
)
p = re.sub(
    r"\n  useEffect\(\(\) => \{\n    saveTripUi\(trip\.id, \{\n      timelineCollapsed,[\s\S]*?\}, \[trip\.id, timelineCollapsed, collapsedSheets\]\);\n\n  const toggleSheet",
    "\n  const toggleSheet",
    p,
    count=1,
)

anchor_p = '  const toggleSheet = (key: string) => {\n    setCollapsedSheets(prev => ({ ...prev, [key]: !prev[key] }));\n  };'
repl_p = '''  useEffect(() => {
    const pref = loadTripUi(trip.id);
    setTimelineCollapsed(!!pref.timelineCollapsed);
    setCollapsedSheets(pref.planCollapsedSheets || {});
  }, [trip.id]);

  const toggleSheet = (key: string) => {
    setCollapsedSheets(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveTripUi(trip.id, { planCollapsedSheets: next });
      return next;
    });
  };'''
if anchor_p in p:
    p = p.replace(anchor_p, repl_p, 1)
    print('Plan toggles')
else:
    print('Plan anchor missing')

# timeline button
p = p.replace(
    'onClick={() => setTimelineCollapsed(!timelineCollapsed)}',
    '''onClick={() => {
                const next = !timelineCollapsed;
                setTimelineCollapsed(next);
                saveTripUi(trip.id, { timelineCollapsed: next });
              }}''',
)
# undo double-replace
while p.count('const next = !timelineCollapsed;') > 1:
    # leave one
    break
pp.write_text(p)

# --- TripDetailView ---
td = Path('src/components/TripDetailView.tsx')
t = td.read_text()
# strip layered effects
t = re.sub(
    r"\n  useEffect\(\(\) => \{\n    const pref = loadTripUi\(trip\.id\);\n    setShowMapBanner\(!!pref\.showMapBanner\);\n    setPlanViewMode\(pref\.planViewMode \|\| 'both'\);\n  \}, \[trip\.id\]\);\n\n  useEffect\(\(\) => \{\n    saveTripUi\(trip\.id, \{ showMapBanner, planViewMode \}\);\n  \}, \[trip\.id, showMapBanner, planViewMode\]\);",
    '',
    t,
    count=1,
)
t = re.sub(
    r"\n  useEffect\(\(\) => \{\n    saveTripUi\(trip\.id, \{ showMapBanner, planViewMode \}\);\n  \}, \[trip\.id, showMapBanner, planViewMode\]\);",
    '',
    t,
    count=1,
)

insert_after = "  const [planViewMode, setPlanViewMode] = React.useState<'both' | 'timeline' | 'map'>(() => _prefs.planViewMode || 'both');"
if insert_after in t and 'setPlanViewMode(pref.planViewMode' not in t:
    t = t.replace(
        insert_after,
        insert_after + '''

  useEffect(() => {
    const pref = loadTripUi(trip.id);
    setShowMapBanner(!!pref.showMapBanner);
    setPlanViewMode(pref.planViewMode || 'both');
  }, [trip.id]);''',
        1,
    )
    print('TripDetail rehydrate')

# Persist plan view toggles on click — patch setShowMapBanner and setPlanViewMode calls
t = t.replace(
    'onClick={() => setShowMapBanner(!showMapBanner)}',
    '''onClick={() => {
              const next = !showMapBanner;
              setShowMapBanner(next);
              saveTripUi(trip.id, { showMapBanner: next });
            }}''',
)
for mode in ('both', 'timeline', 'map'):
    t = t.replace(
        f"onClick={{() => setPlanViewMode('{mode}')}}",
        f"onClick={{() => {{ setPlanViewMode('{mode}'); saveTripUi(trip.id, {{ planViewMode: '{mode}' }}); }}}}",
    )
td.write_text(t)
print('TripDetail clicks')

# --- App key ---
app = Path('src/App.tsx')
a = app.read_text()
if 'key={currentTrip.id}' not in a:
    if '<TripDetailView\n            trip={currentTrip}' in a:
        a = a.replace(
            '<TripDetailView\n            trip={currentTrip}',
            '<TripDetailView\n            key={currentTrip.id}\n            trip={currentTrip}',
            1,
        )
        app.write_text(a)
        print('App key')
    elif '<TripDetailView' in a:
        a = a.replace('<TripDetailView', '<TripDetailView key={currentTrip.id}', 1)
        app.write_text(a)
        print('App key alt')
else:
    print('App key ok')

print('done')
