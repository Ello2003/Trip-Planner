from pathlib import Path

rp = Path('src/components/ResearchTab.tsx')
r = rp.read_text()

if 'onReorderSheets' not in r:
    r = r.replace(
        '  onManageSheets: () => void;\n  onOpenMapSettings: () => void;\n}',
        '  onManageSheets: () => void;\n  onOpenMapSettings: () => void;\n  onReorderSheets?: (sheets: Sheet[]) => void;\n}',
        1,
    )
    r = r.replace(
        '  onManageSheets,\n  onOpenMapSettings\n}) => {',
        '  onManageSheets,\n  onOpenMapSettings,\n  onReorderSheets\n}) => {',
        1,
    )

if 'handleReorderSections' not in r:
    needle = '  return (\n    <div>\n      <div className="toolbar"'
    insert = (
        '  const visibleSheets = sheets.filter(s => !trip.hiddenSheets.includes(s.key));\n\n'
        '  const handleReorderSections = (_from: number, _to: number, newKeys: string[]) => {\n'
        '    if (!onReorderSheets) return;\n'
        '    const byKey = new Map(sheets.map(s => [s.key, s]));\n'
        '    const ordered = newKeys.map(k => byKey.get(k)).filter(Boolean) as Sheet[];\n'
        '    const rest = sheets.filter(s => !newKeys.includes(s.key));\n'
        '    onReorderSheets([...ordered, ...rest]);\n'
        '  };\n\n'
        '  return (\n'
        '    <div>\n'
        '      <div className="toolbar"'
    )
    if needle not in r:
        raise SystemExit('return needle missing')
    r = r.replace(needle, insert, 1)

old = (
    "      {researchView !== 'map' && (\n"
    "        <div>\n"
    "          {sheets.filter(s => !trip.hiddenSheets.includes(s.key)).map(s => {\n"
    "            const items = trip.research.filter(r => r.sheet === s.key);\n"
    "            const isCollapsed = collapsedSheets[s.key];\n"
    "            const hasMap = !!trip.sectionMapUrls[s.key];\n"
    "            const mapExpanded = expandedSectionMaps[s.key];\n"
    "            const mapEditing = sectionMapEditMode[s.key];\n"
    "            return (\n"
    "              <div className={`sheet-section ${items.length ? '' : 'is-empty'}`} key={s.key}>\n"
    "                <div className=\"sheet-header\">\n"
    "                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }} onClick={() => toggleSheet(s.key)}>\n"
)
new = (
    "      {researchView !== 'map' && (\n"
    "        <div>\n"
    "          <SortableList\n"
    "            ids={visibleSheets.map(s => s.key)}\n"
    "            onReorder={handleReorderSections}\n"
    "            disabled={!onReorderSheets}\n"
    "          >\n"
    "          {visibleSheets.map(s => {\n"
    "            const items = trip.research.filter(r => r.sheet === s.key);\n"
    "            const isCollapsed = collapsedSheets[s.key];\n"
    "            const hasMap = !!trip.sectionMapUrls[s.key];\n"
    "            const mapExpanded = expandedSectionMaps[s.key];\n"
    "            const mapEditing = sectionMapEditMode[s.key];\n"
    "            return (\n"
    "              <SortableRow\n"
    "                id={s.key}\n"
    "                key={s.key}\n"
    "                className={`sheet-section ${items.length ? '' : 'is-empty'}`}\n"
    "                disabled={!onReorderSheets}\n"
    "              >\n"
    "                <div className=\"sheet-header\">\n"
    "                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }} onClick={() => toggleSheet(s.key)}>\n"
    "                    {onReorderSheets ? <DragHandle /> : null}\n"
)
if 'ids={visibleSheets.map' not in r:
    if old not in r:
        raise SystemExit('section open missing')
    r = r.replace(old, new, 1)

old_end = (
    '                      <div className="empty-state">Nothing here yet.</div>\n'
    '                    )}\n'
    '                  </div>\n'
    '                )}\n'
    '              </div>\n'
    '            );\n'
    '          })}\n'
    '        </div>\n'
    '      )}\n'
    '    </div>\n'
    '  );\n'
    '};'
)
new_end = (
    '                      <div className="empty-state">Nothing here yet.</div>\n'
    '                    )}\n'
    '                  </div>\n'
    '                )}\n'
    '              </SortableRow>\n'
    '            );\n'
    '          })}\n'
    '          </SortableList>\n'
    '        </div>\n'
    '      )}\n'
    '    </div>\n'
    '  );\n'
    '};'
)
if '</SortableList>' not in r or r.count('</SortableList>') < 2:
    if old_end not in r:
        raise SystemExit('section end missing')
    r = r.replace(old_end, new_end, 1)

rp.write_text(r)
print('research', 'visibleSheets' in r, r.count('</SortableList>'))

td = Path('src/components/TripDetailView.tsx')
t = td.read_text()
if 'onReorderSheets' not in t:
    t = t.replace(
        '  onRecolorSheet?: (key: string, color: string) => void;\n  settings: Settings;',
        '  onRecolorSheet?: (key: string, color: string) => void;\n  onReorderSheets?: (sheets: Sheet[]) => void;\n  settings: Settings;',
        1,
    )
    t = t.replace(
        '  onRecolorSheet,\n  settings,',
        '  onRecolorSheet,\n  onReorderSheets,\n  settings,',
        1,
    )
    t = t.replace(
        '          onRecolorSheet={onRecolorSheet}\n          onUpdateTrip={onUpdateTrip}\n          onOpenAddResearchModal',
        '          onRecolorSheet={onRecolorSheet}\n          onReorderSheets={onReorderSheets}\n          onUpdateTrip={onUpdateTrip}\n          onOpenAddResearchModal',
        1,
    )
    td.write_text(t)
    print('td')
else:
    print('td already')

a = Path('src/App.tsx').read_text()
if 'handleReorderSheets' not in a:
    old = (
        '  const handleRecolorSheet = useCallback(\n'
        '    (key: string, color: string) => {\n'
        '      updateState(prev => ({ ...prev, sheets: prev.sheets.map(s => (s.key === key ? { ...s, color } : s)) }));\n'
        '    },\n'
        '    [updateState]\n'
        '  );'
    )
    new = old + (
        '\n\n  const handleReorderSheets = useCallback(\n'
        '    (nextSheets: Sheet[]) => {\n'
        '      updateState(prev => ({ ...prev, sheets: nextSheets }));\n'
        '    },\n'
        '    [updateState]\n'
        '  );'
    )
    if old not in a:
        raise SystemExit('recolor missing')
    a = a.replace(old, new, 1)
    a = a.replace(
        'onRecolorSheet={handleRecolorSheet}\n            settings={state.settings}',
        'onRecolorSheet={handleRecolorSheet}\n            onReorderSheets={handleReorderSheets}\n            settings={state.settings}',
        1,
    )
    Path('src/App.tsx').write_text(a)
    print('app')
else:
    print('app already')
print('done')
