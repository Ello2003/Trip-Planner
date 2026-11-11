from pathlib import Path
import re

# ---- App.tsx ----
app_path = Path('src/App.tsx')
app = app_path.read_text()

if 'loadGlobalUi' not in app:
    # Add import after githubSync import block
    marker = "from './utils/githubSync';"
    if marker in app:
        app = app.replace(
            marker,
            marker + "\nimport { loadGlobalUi, saveGlobalUi } from './utils/uiPrefs';",
            1,
        )
    else:
        app = "import { loadGlobalUi, saveGlobalUi } from './utils/uiPrefs';\n" + app

    old_nav = (
        "const [activeTripId, setActiveTripId] = useState<string | null>(null);\n"
        "  const [activeTripTab, setActiveTripTab] = useState<string>('budget');\n"
        "  const [activeDashTab, setActiveDashTab] = useState<'trips' | 'charts'>('trips');"
    )
    new_nav = (
        "const _ui0 = loadGlobalUi();\n"
        "  const [activeTripId, setActiveTripId] = useState<string | null>(() => _ui0.activeTripId ?? null);\n"
        "  const [activeTripTab, setActiveTripTab] = useState<string>(() => _ui0.activeTripTab || 'budget');\n"
        "  const [activeDashTab, setActiveDashTab] = useState<'trips' | 'charts'>(() => _ui0.activeDashTab || 'trips');\n"
        "\n"
        "  useEffect(() => {\n"
        "    saveGlobalUi({ activeTripId, activeTripTab, activeDashTab });\n"
        "  }, [activeTripId, activeTripTab, activeDashTab]);"
    )
    if old_nav not in app:
        raise SystemExit('App nav block not found')
    app = app.replace(old_nav, new_nav, 1)
    app_path.write_text(app)
    print('App ok')
else:
    print('App already')

# ---- ResearchTab ----
rp = Path('src/components/ResearchTab.tsx')
r = rp.read_text()
if 'loadTripUi' not in r:
    r = r.replace(
        "import React, { useState } from 'react';",
        "import React, { useState, useEffect } from 'react';\nimport { loadTripUi, saveTripUi } from '../utils/uiPrefs';",
        1,
    )
    old = (
        "  const [researchView, setResearchView] = useState<'both' | 'list' | 'map'>('both');\n"
        "  const [collapsedSheets, setCollapsedSheets] = useState<Record<string, boolean>>({});\n"
        "  const [expandedSectionMaps, setExpandedSectionMaps] = useState<Record<string, boolean>>({});"
    )
    new = (
        "  const _prefs = loadTripUi(trip.id);\n"
        "  const [researchView, setResearchView] = useState<'both' | 'list' | 'map'>(() => _prefs.researchView || 'both');\n"
        "  const [collapsedSheets, setCollapsedSheets] = useState<Record<string, boolean>>(() => _prefs.researchCollapsedSheets || {});\n"
        "  const [expandedSectionMaps, setExpandedSectionMaps] = useState<Record<string, boolean>>(() => _prefs.researchExpandedMaps || {});"
    )
    if old not in r:
        raise SystemExit('Research state block not found')
    r = r.replace(old, new, 1)
    r = r.replace(
        '  const toggleSheet = (key: string) => {',
        "  useEffect(() => {\n"
        "    saveTripUi(trip.id, {\n"
        "      researchView,\n"
        "      researchCollapsedSheets: collapsedSheets,\n"
        "      researchExpandedMaps: expandedSectionMaps\n"
        "    });\n"
        "  }, [trip.id, researchView, collapsedSheets, expandedSectionMaps]);\n\n"
        "  const toggleSheet = (key: string) => {",
        1,
    )
    rp.write_text(r)
    print('Research ok')
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
    old = (
        "  const [timelineCollapsed, setTimelineCollapsed] = useState(false);\n"
        "  const [collapsedSheets, setCollapsedSheets] = useState<Record<string, boolean>>({});"
    )
    new = (
        "  const _prefs = loadTripUi(trip.id);\n"
        "  const [timelineCollapsed, setTimelineCollapsed] = useState(() => !!_prefs.timelineCollapsed);\n"
        "  const [collapsedSheets, setCollapsedSheets] = useState<Record<string, boolean>>(() => _prefs.planCollapsedSheets || {});"
    )
    if old not in p:
        raise SystemExit('Plan state block not found')
    p = p.replace(old, new, 1)
    p = p.replace(
        '  const toggleSheet = (key: string) => {',
        "  useEffect(() => {\n"
        "    saveTripUi(trip.id, {\n"
        "      timelineCollapsed,\n"
        "      planCollapsedSheets: collapsedSheets\n"
        "    });\n"
        "  }, [trip.id, timelineCollapsed, collapsedSheets]);\n\n"
        "  const toggleSheet = (key: string) => {",
        1,
    )
    pp.write_text(p)
    print('Plan ok')
else:
    print('Plan already')

# ---- TripDetailView ----
td = Path('src/components/TripDetailView.tsx')
t = td.read_text()
if 'loadTripUi' not in t:
    if "from '../utils/uiPrefs'" not in t:
        t = t.replace(
            "import React from 'react';",
            "import React, { useEffect } from 'react';\nimport { loadTripUi, saveTripUi } from '../utils/uiPrefs';",
            1,
        )
        # maybe already useState from react differently
        if "import React from 'react'" not in t and "loadTripUi" not in t:
            t = "import { loadTripUi, saveTripUi } from '../utils/uiPrefs';\n" + t
    old = (
        "  const [showMapBanner, setShowMapBanner] = React.useState<boolean>(false);\n"
        "  const [planViewMode, setPlanViewMode] = React.useState<'both' | 'timeline' | 'map'>('both');"
    )
    new = (
        "  const _prefs = loadTripUi(trip.id);\n"
        "  const [showMapBanner, setShowMapBanner] = React.useState<boolean>(() => !!_prefs.showMapBanner);\n"
        "  const [planViewMode, setPlanViewMode] = React.useState<'both' | 'timeline' | 'map'>(() => _prefs.planViewMode || 'both');\n"
        "\n"
        "  useEffect(() => {\n"
        "    saveTripUi(trip.id, { showMapBanner, planViewMode });\n"
        "  }, [trip.id, showMapBanner, planViewMode]);"
    )
    if old not in t:
        # try without React.
        old2 = old.replace('React.useState', 'useState')
        new2 = new.replace('React.useState', 'useState')
        if old2 in t:
            t = t.replace(old2, new2, 1)
        else:
            raise SystemExit('TripDetail state block not found: ' + repr(t[t.find('showMapBanner')-20:t.find('showMapBanner')+120]))
    else:
        t = t.replace(old, new, 1)
    td.write_text(t)
    print('TripDetail ok')
else:
    print('TripDetail already')

print('done')
