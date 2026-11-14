from pathlib import Path
import re

# --- ResearchTab: rehydrate on trip change + immediate save on toggle ---
rp = Path('src/components/ResearchTab.tsx')
r = rp.read_text()

# Replace the persist useEffect + toggleSheet block with stronger version
old_block = '''  useEffect(() => {
    saveTripUi(trip.id, {
      researchView,
      researchCollapsedSheets: collapsedSheets,
      researchExpandedMaps: expandedSectionMaps
    });
  }, [trip.id, researchView, collapsedSheets, expandedSectionMaps]);

  const toggleSheet = (key: string) => {
    setCollapsedSheets(prev => ({ ...prev, [key]: !prev[key] }));
  };'''

new_block = '''  // Re-load when switching trips (component may stay mounted)
  useEffect(() => {
    const p = loadTripUi(trip.id);
    setResearchView(p.researchView || 'both');
    setCollapsedSheets(p.researchCollapsedSheets || {});
    setExpandedSectionMaps(p.researchExpandedMaps || {});
  }, [trip.id]);

  // Persist whenever these change
  useEffect(() => {
    saveTripUi(trip.id, {
      researchView,
      researchCollapsedSheets: collapsedSheets,
      researchExpandedMaps: expandedSectionMaps
    });
  }, [trip.id, researchView, collapsedSheets, expandedSectionMaps]);

  const toggleSheet = (key: string) => {
    setCollapsedSheets(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveTripUi(trip.id, { researchCollapsedSheets: next });
      return next;
    });
  };'''

if old_block in r:
    r = r.replace(old_block, new_block, 1)
    print('Research block updated')
elif 'Re-load when switching trips' in r:
    print('Research already hardened')
else:
    print('Research WARN: block not found')

# Also wrap setResearchView in buttons to save — optional; useEffect covers it
# Harden toggleSectionMap
if 'const toggleSectionMap = (key: string) => {\n    setExpandedSectionMaps(prev => ({ ...prev, [key]: !prev[key] }));\n  };' in r:
    r = r.replace(
        'const toggleSectionMap = (key: string) => {\n    setExpandedSectionMaps(prev => ({ ...prev, [key]: !prev[key] }));\n  };',
        '''const toggleSectionMap = (key: string) => {
    setExpandedSectionMaps(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveTripUi(trip.id, { researchExpandedMaps: next });
      return next;
    });
  };''',
        1,
    )
    print('Research section map toggle')

rp.write_text(r)

# --- PlanTab ---
pp = Path('src/components/PlanTab.tsx')
p = pp.read_text()
old_p = '''  useEffect(() => {
    saveTripUi(trip.id, {
      timelineCollapsed,
      planCollapsedSheets: collapsedSheets
    });
  }, [trip.id, timelineCollapsed, collapsedSheets]);

  const toggleSheet = (key: string) => {
    setCollapsedSheets(prev => ({ ...prev, [key]: !prev[key] }));
  };'''
new_p = '''  useEffect(() => {
    const pref = loadTripUi(trip.id);
    setTimelineCollapsed(!!pref.timelineCollapsed);
    setCollapsedSheets(pref.planCollapsedSheets || {});
  }, [trip.id]);

  useEffect(() => {
    saveTripUi(trip.id, {
      timelineCollapsed,
      planCollapsedSheets: collapsedSheets
    });
  }, [trip.id, timelineCollapsed, collapsedSheets]);

  const toggleSheet = (key: string) => {
    setCollapsedSheets(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveTripUi(trip.id, { planCollapsedSheets: next });
      return next;
    });
  };'''
if old_p in p:
    p = p.replace(old_p, new_p, 1)
    print('Plan block updated')
elif 'setTimelineCollapsed(!!pref.timelineCollapsed)' in p:
    print('Plan already hardened')
else:
    print('Plan WARN')

# timeline collapse button should also save immediately - find setTimelineCollapsed(!timelineCollapsed)
p = p.replace(
    'onClick={() => setTimelineCollapsed(!timelineCollapsed)}',
    '''onClick={() => {
                const next = !timelineCollapsed;
                setTimelineCollapsed(next);
                saveTripUi(trip.id, { timelineCollapsed: next });
              }}''',
    1,
)
pp.write_text(p)
print('Plan timeline toggle')

# --- TripDetailView: rehydrate plan view on trip change ---
td = Path('src/components/TripDetailView.tsx')
t = td.read_text()
old_td = '''  useEffect(() => {
    saveTripUi(trip.id, { showMapBanner, planViewMode });
  }, [trip.id, showMapBanner, planViewMode]);'''
new_td = '''  useEffect(() => {
    const pref = loadTripUi(trip.id);
    setShowMapBanner(!!pref.showMapBanner);
    setPlanViewMode(pref.planViewMode || 'both');
  }, [trip.id]);

  useEffect(() => {
    saveTripUi(trip.id, { showMapBanner, planViewMode });
  }, [trip.id, showMapBanner, planViewMode]);'''
if old_td in t:
    t = t.replace(old_td, new_td, 1)
    print('TripDetail updated')
elif 'setPlanViewMode(pref.planViewMode' in t:
    print('TripDetail already')
else:
    print('TripDetail WARN')
td.write_text(t)

# --- App: key TripDetailView by trip id so state resets cleanly ---
app = Path('src/App.tsx')
a = app.read_text()
if '<TripDetailView\n            trip={currentTrip}' in a and 'key={currentTrip.id}' not in a:
    a = a.replace(
        '<TripDetailView\n            trip={currentTrip}',
        '<TripDetailView\n            key={currentTrip.id}\n            trip={currentTrip}',
        1,
    )
    app.write_text(a)
    print('App key')
elif 'key={currentTrip.id}' in a:
    print('App key present')
else:
    # try single line
    if 'key={currentTrip.id}' not in a and '<TripDetailView' in a:
        a = a.replace('<TripDetailView', '<TripDetailView key={currentTrip?.id}', 1)
        app.write_text(a)
        print('App key alt')
    else:
        print('App key skip')

print('done')
