from pathlib import Path
import re

# ---- App.tsx: restore/save active trip + tabs ----
app_path = Path('src/App.tsx')
app = app_path.read_text()
if "from './utils/uiPrefs'" not in app and 'from "./utils/uiPrefs"' not in app:
    # after other util imports
    if "from './utils/storage'" in app:
        app = app.replace(
            "from './utils/storage'",
            "from './utils/storage'\nimport { loadGlobalUi, saveGlobalUi } from './utils/uiPrefs'",
            1,
        )
    else:
        app = "import { loadGlobalUi, saveGlobalUi } from './utils/uiPrefs';\n" + app

# Replace initial useState for navigation
if 'loadGlobalUi()' not in app:
    app = app.replace(
        "const [activeTripId, setActiveTripId] = useState<string | null>(null);\n  const [activeTripTab, setActiveTripTab] = useState<string>('budget');\n  const [activeDashTab, setActiveDashTab] = useState<'trips' | 'charts'>('trips');",
        """const _ui0 = loadGlobalUi();
  const [activeTripId, setActiveTripId] = useState<string | null>(() => _ui0.activeTripId ?? null);
  const [activeTripTab, setActiveTripTab] = useState<string>(() => _ui0.activeTripTab || 'budget');
  const [activeDashTab, setActiveDashTab] = useState<'trips' | 'charts'>(() => _ui0.activeDashTab || 'trips');

  useEffect(() => {
    saveGlobalUi({ activeTripId, activeTripTab, activeDashTab });
  }, [activeTripId, activeTripTab, activeDashTab]);""",
        1,
    )
    print('App navigation prefs')
else:
    print('App already')

app_path.write_text(app)

# ---- ResearchTab ----
rp = Path('src/components/ResearchTab.tsx')
r = rp.read_text()
if 'loadTripUi' not in r:
    r = r.replace(
        "import React, { useState } from 'react';",
        "import React, { useState, useEffect } from 'react';\nimport { loadTripUi, saveTripUi } from '../utils/uiPrefs';",
        1,
    )
    # replace researchView + collapsed state init
    r = r.replace(
        "  const [researchView, setResearchView] = useState<'both' | 'list' | 'map'>('both');\n  const [collapsedSheets, setCollapsedSheets] = useState<Record<string, boolean>>({});\n  const [expandedSectionMaps, setExpandedSectionMaps] = useState<Record<string, boolean>>({});",
        """  const _prefs = loadTripUi(trip.id);
  const [researchView, setResearchView] = useState<'both' | 'list' | 'map'>(() => _prefs.researchView || 'both');
  const [collapsedSheets, setCollapsedSheets] = useState<Record<string, boolean>>(() => _prefs.researchCollapsedSheets || {});
  const [expandedSectionMaps, setExpandedSectionMaps] = useState<Record<string, boolean>>(() => _prefs.researchExpandedMaps || {});""",
        1,
    )
    # persist on change — insert after state declarations block before toggleSheet
    if 'saveTripUi(trip.id' not in r:
        r = r.replace(
            '  const toggleSheet = (key: string) => {',
            """  useEffect(() => {
    saveTripUi(trip.id, {
      researchView,
      researchCollapsedSheets: collapsedSheets,
      researchExpandedMaps: expandedSectionMaps
    });
  }, [trip.id, researchView, collapsedSheets, expandedSectionMaps]);

  const toggleSheet = (key: string) => {""",
            1,
        )
    rp.write_text(r)
    print('ResearchTab')
else:
    print('Research already')

# ---- PlanTab ----
pp = Path('src/components/PlanTab.tsx')
p = pp.read_text()
if 'loadTripUi' not in p:
    p = p.replace(
        "import React, { useState } from 'react';",
        "import React, { useState, useEffect } from 'react';\nimport { loadTripUi, saveTripUi } from '../utils/uiPrefs';",
        1,
    )
    p = p.replace(
        "  const [timelineCollapsed, setTimelineCollapsed] = useState(false);\n  const [collapsedSheets, setCollapsedSheets] = useState<Record<string, boolean>>({});",
        """  const _prefs = loadTripUi(trip.id);
  const [timelineCollapsed, setTimelineCollapsed] = useState(() => !!_prefs.timelineCollapsed);
  const [collapsedSheets, setCollapsedSheets] = useState<Record<string, boolean>>(() => _prefs.planCollapsedSheets || {});""",
        1,
    )
    if 'saveTripUi(trip.id' not in p:
        p = p.replace(
            '  const toggleSheet = (key: string) => {',
            """  useEffect(() => {
    saveTripUi(trip.id, {
      timelineCollapsed,
      planCollapsedSheets: collapsedSheets
    });
  }, [trip.id, timelineCollapsed, collapsedSheets]);

  const toggleSheet = (key: string) => {""",
            1,
        )
    pp.write_text(p)
    print('PlanTab')
else:
    print('Plan already')

# ---- TripDetailView ----
td = Path('src/components/TripDetailView.tsx')
t = td.read_text()
if 'loadTripUi' not in t:
    if "from '../utils/uiPrefs'" not in t:
        # after react import
        t = t.replace(
            "import React from 'react';",
            "import React, { useEffect } from 'react';\nimport { loadTripUi, saveTripUi } from '../utils/uiPrefs';",
            1,
        )
    t = t.replace(
        "  const [showMapBanner, setShowMapBanner] = React.useState<boolean>(false);\n  const [planViewMode, setPlanViewMode] = React.useState<'both' | 'timeline' | 'map'>('both');",
        """  const _prefs = loadTripUi(trip.id);
  const [showMapBanner, setShowMapBanner] = React.useState<boolean>(() => !!_prefs.showMapBanner);
  const [planViewMode, setPlanViewMode] = React.useState<'both' | 'timeline' | 'map'>(() => _prefs.planViewMode || 'both');

  useEffect(() => {
    saveTripUi(trip.id, { showMapBanner, planViewMode });
  }, [trip.id, showMapBanner, planViewMode]);""",
        1,
    )
    td.write_text(t)
    print('TripDetailView')
else:
    print('TripDetail already')

print('done')
