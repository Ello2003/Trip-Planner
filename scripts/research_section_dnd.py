from pathlib import Path
import re

# ---- ResearchTab ----
rp = Path('src/components/ResearchTab.tsx')
r = rp.read_text()

if 'onReorderSheets' not in r:
    r = r.replace(
        "  onManageSheets: () => void;\n  onOpenMapSettings: () => void;\n}",
        "  onManageSheets: () => void;\n  onOpenMapSettings: () => void;\n  onReorderSheets?: (sheets: Sheet[]) => void;\n}",
        1,
    )
    r = r.replace(
        "  onManageSheets,\n  onOpenMapSettings\n}) => {",
        "  onManageSheets,\n  onOpenMapSettings,\n  onReorderSheets\n}) => {",
        1,
    )
    print('props')

# Add reorder handler before return
if 'handleReorderSections' not in r:
    r = r.replace(
        "  return (\n    <div>\n      <div className=\"toolbar\"",
        '''  const visibleSheets = sheets.filter(s => !trip.hiddenSheets.includes(s.key));

  const handleReorderSections = (_from: number, _to: number, newKeys: string[]) => {
    if (!onReorderSheets) return;
    const byKey = new Map(sheets.map(s => [s.key, s]));
    const ordered = newKeys.map(k => byKey.get(k)).filter(Boolean) as Sheet[];
    const rest = sheets.filter(s => !newKeys.includes(s.key));
    onReorderSheets([...ordered, ...rest]);
  };

  return (
    <div>
      <div className="toolbar"''',
        1,
    )
    print('handler')

# Wrap section list in SortableList
old_list = '''      {researchView !== 'map' && (
        <div>
          {sheets.filter(s => !trip.hiddenSheets.includes(s.key)).map(s => {
            const items = trip.research.filter(r => r.sheet === s.key);
            const isCollapsed = collapsedSheets[s.key];
            const hasMap = !!trip.sectionMapUrls[s.key];
            const mapExpanded = expandedSectionMaps[s.key];
            const mapEditing = sectionMapEditMode[s.key];
            return (
              <div className={`sheet-section ${items.length ? '' : 'is-empty'}`} key={s.key}>
                <div className="sheet-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }} onClick={() => toggleSheet(s.key)}>
                    <span>{isCollapsed ? '\\u25B8' : '\\u25BE'}</span>'''

# The file may use actual unicode or escape - check
if 'SortableList ids={visibleSheets' in r:
    print('section dnd already')
else:
    # more flexible replace
    pattern = r"\{researchView !== 'map' && \(\s*<div>\s*\{sheets\.filter\(s => !trip\.hiddenSheets\.includes\(s\.key\)\)\.map\(s => \{"
    repl = "{researchView !== 'map' && (\n        <div>\n          <SortableList\n            ids={visibleSheets.map(s => s.key)}\n            onReorder={handleReorderSections}\n            disabled={!onReorderSheets}\n          >\n          {visibleSheets.map(s => {"
    r2, n = re.subn(pattern, repl, r, count=1)
    if n != 1:
        # try without escape
        old = "{researchView !== 'map' && (\n        <div>\n          {sheets.filter(s => !trip.hiddenSheets.includes(s.key)).map(s => {"
        new = "{researchView !== 'map' && (\n        <div>\n          <SortableList\n            ids={visibleSheets.map(s => s.key)}\n            onReorder={handleReorderSections}\n            disabled={!onReorderSheets}\n          >\n          {visibleSheets.map(s => {"
        if old in r:
            r = r.replace(old, new, 1)
            print('list open')
        else:
            print('list open WARN')
            print(repr(r[r.find("researchView !== 'map'"):r.find("researchView !== 'map'")+200]))
    else:
        r = r2
        print('list open re')

    # Replace outer div sheet-section with SortableRow
    old_sec = "return (\n              <div className={`sheet-section ${items.length ? '' : 'is-empty'}`} key={s.key}>\n                <div className=\"sheet-header\">\n                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }} onClick={() => toggleSheet(s.key)}>"
    new_sec = "return (\n              <SortableRow id={s.key} key={s.key} className={`sheet-section ${items.length ? '' : 'is-empty'}`} disabled={!onReorderSheets}>\n                <div className=\"sheet-header\">\n                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }} onClick={() => toggleSheet(s.key)}>\n                    {onReorderSheets && <DragHandle />}"
    if old_sec in r:
        r = r.replace(old_sec, new_sec, 1)
        print('sortable row open')
    else:
        # unicode triangles in span
        old_sec2 = "return (\n              <div className={`sheet-section ${items.length ? '' : 'is-empty'}`} key={s.key}>\n                <div className=\"sheet-header\">"
        if old_sec2 in r:
            r = r.replace(
                old_sec2,
                "return (\n              <SortableRow id={s.key} key={s.key} className={`sheet-section ${items.length ? '' : 'is-empty'}`} disabled={!onReorderSheets}>\n                <div className=\"sheet-header\">",
                1,
            )
            # inject drag handle after opening flex div
            r = r.replace(
                "<div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }} onClick={() => toggleSheet(s.key)}>\n                    <span>",
                "<div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }} onClick={() => toggleSheet(s.key)}>\n                    {onReorderSheets && <DragHandle />}\n                    <span>",
                1,
            )
            print('sortable row open alt')
        else:
            print('sortable row WARN')

    # Close SortableRow instead of div for section - find the end of map callback
    # Pattern: closing of sheet-section div before }); of map
    # Typically:              </div>\n            );\n          })}\n        </div>\n      )}
    old_close = "          })}\n        </div>\n      )}"
    # need to only change research section close - there may be multiple
    # Find after researchView !== map block more carefully
    idx = r.find("ids={visibleSheets.map")
    if idx < 0:
        idx = r.find("visibleSheets.map(s =>")
    if idx > 0:
        # from idx, find first `          })}\n        </div>\n      )}` after sheet sections
        sub = r[idx:]
        # replace closing of outer map - the sheet section ends with </div> then ); then })}
        # Change `              </div>\n            );\n          })}\n        </div>` to close SortableRow and SortableList
        old_end = "            );\n          })}\n        </div>\n      )}"
        # Might be `              </div>\n            );` for sheet-section
        # Replace last sheet-section closing div with SortableRow close
        # Search for pattern inside research list only
        m = re.search(
            r"(              </div>\n            \);\n          \}\)}\n        </div>\n      \)}",
            sub,
        )
        if m:
            replacement = "            );\n          })}\n          </SortableList>\n        </div>\n      )}"
            # Also need </SortableRow> instead of final </div> of section
            # The match's first part is `              </div>` which closes sheet-section
            # Looking at structure:
            # SortableRow
            #   sheet-header div
            #   content div
            # /SortableRow
            # so the `              </div>` before `);` is sheet-section outer - should be </SortableRow>
            inner = m.group(0).replace(
                "              </div>\n            );\n          })}\n        </div>\n      )}",
                "              </SortableRow>\n            );\n          })}\n          </SortableList>\n        </div>\n      )}",
                1,
            )
            r = r[:idx] + sub[:m.start()] + inner + sub[m.end():]
            print('list close')
        else:
            print('list close WARN', repr(sub[-400:]))

rp.write_text(r)

# Fix: if we still have <div className={`sheet-section and SortableRow, remove duplicate
# Verify SortableRow open exists
r = rp.read_text()
if 'SortableRow id={s.key}' in r and '</SortableRow>' not in r:
    # force close: replace the sheet-section closing before ); of map item
    r = r.replace(
        "                    ) : (\n                      <div className=\"empty-state\">Nothing here yet.</div>\n                    )}\n                  </div>\n                )}\n              </div>\n            );",
        "                    ) : (\n                      <div className=\"empty-state\">Nothing here yet.</div>\n                    )}\n                  </div>\n                )}\n              </SortableRow>\n            );",
        1,
    )
    if '</SortableList>' not in r:
        r = r.replace(
            "          })}\n        </div>\n      )}\n    </div>\n  );\n};",
            "          })}\n          </SortableList>\n        </div>\n      )}\n    </div>\n  );\n};",
            1,
        )
    rp.write_text(r)
    print('forced close')

print('Research done', 'SortableRow id={s.key}' in rp.read_text(), '</SortableList>' in rp.read_text())

# ---- TripDetailView ----
td = Path('src/components/TripDetailView.tsx')
t = td.read_text()
if 'onReorderSheets' not in t:
    t = t.replace(
        "  onRecolorSheet?: (key: string, color: string) => void;\n  settings: Settings;",
        "  onRecolorSheet?: (key: string, color: string) => void;\n  onReorderSheets?: (sheets: Sheet[]) => void;\n  settings: Settings;",
        1,
    )
    t = t.replace(
        "  onRecolorSheet,\n  settings,",
        "  onRecolorSheet,\n  onReorderSheets,\n  settings,",
        1,
    )
    t = t.replace(
        "          onRecolorSheet={onRecolorSheet}\n          onUpdateTrip={onUpdateTrip}\n          onOpenAddResearchModal",
        "          onRecolorSheet={onRecolorSheet}\n          onReorderSheets={onReorderSheets}\n          onUpdateTrip={onUpdateTrip}\n          onOpenAddResearchModal",
        1,
    )
    # also plan tab if same pattern - optional
    td.write_text(t)
    print('TripDetail')
else:
    print('TripDetail already')

# ---- App ----
app = Path('src/App.tsx')
a = app.read_text()
if 'handleReorderSheets' not in a:
    a = a.replace(
        '''  const handleRecolorSheet = useCallback(
    (key: string, color: string) => {
      updateState(prev => ({ ...prev, sheets: prev.sheets.map(s => (s.key === key ? { ...s, color } : s)) }));
    },
    [updateState]
  );''',
        '''  const handleRecolorSheet = useCallback(
    (key: string, color: string) => {
      updateState(prev => ({ ...prev, sheets: prev.sheets.map(s => (s.key === key ? { ...s, color } : s)) }));
    },
    [updateState]
  );

  const handleReorderSheets = useCallback(
    (nextSheets: Sheet[]) => {
      updateState(prev => ({ ...prev, sheets: nextSheets }));
    },
    [updateState]
  );''',
        1,
    )
    a = a.replace(
        'onRecolorSheet={handleRecolorSheet}\n            settings={state.settings}',
        'onRecolorSheet={handleRecolorSheet}\n            onReorderSheets={handleReorderSheets}\n            settings={state.settings}',
        1,
    )
    # ensure Sheet type imported - already have Sheet in imports
    app.write_text(a)
    print('App')
else:
    print('App already')

print('done')
