from pathlib import Path

pp = Path('src/components/PlanTab.tsx')
p = pp.read_text()

# Props
if 'onReorderSheets' not in p:
    p = p.replace(
        "  onManageSheets: () => void;\n  onExportPDF: () => void;",
        "  onManageSheets: () => void;\n  onReorderSheets?: (sheets: Sheet[]) => void;\n  onExportPDF: () => void;",
        1,
    )
    p = p.replace(
        "  onManageSheets,\n  onExportPDF,",
        "  onManageSheets,\n  onReorderSheets,\n  onExportPDF,",
        1,
    )
    print('props')
else:
    print('props already')

# Helpers after toggleSheet
if 'handleReorderSections' not in p:
    import re
    m = re.search(r'  const toggleSheet = \(key: string\) => \{[\s\S]*?\n  \};', p)
    if not m:
        raise SystemExit('toggleSheet missing')
    extra = m.group(0) + '''

  const hideSheet = (key: string) => {
    if (trip.hiddenSheets.includes(key)) return;
    onUpdateTrip({
      ...trip,
      hiddenSheets: [...trip.hiddenSheets, key],
      updatedAt: Date.now()
    });
  };

  const showSheet = (key: string) => {
    onUpdateTrip({
      ...trip,
      hiddenSheets: trip.hiddenSheets.filter(k => k !== key),
      updatedAt: Date.now()
    });
  };

  const collapseAllSections = () => {
    const keys = sheets.filter(s => !trip.hiddenSheets.includes(s.key)).map(s => s.key);
    const next: Record<string, boolean> = { ...collapsedSheets };
    keys.forEach(k => {
      next[k] = true;
    });
    setCollapsedSheets(next);
    saveTripUi(trip.id, { planCollapsedSheets: next });
  };

  const expandAllSections = () => {
    const keys = sheets.filter(s => !trip.hiddenSheets.includes(s.key)).map(s => s.key);
    const next: Record<string, boolean> = { ...collapsedSheets };
    keys.forEach(k => {
      next[k] = false;
    });
    setCollapsedSheets(next);
    saveTripUi(trip.id, { planCollapsedSheets: next });
  };

  const visibleSheets = sheets.filter(s => !trip.hiddenSheets.includes(s.key));

  const handleReorderSections = (_from: number, _to: number, newKeys: string[]) => {
    if (!onReorderSheets) return;
    const byKey = new Map(sheets.map(s => [s.key, s]));
    const ordered = newKeys.map(k => byKey.get(k)).filter(Boolean) as Sheet[];
    const rest = sheets.filter(s => !newKeys.includes(s.key));
    onReorderSheets([...ordered, ...rest]);
  };'''
    p = p[:m.start()] + extra + p[m.end():]
    print('helpers')
else:
    print('helpers already')

# Toolbar
old_tb = '''        <button className="btn-ghost" onClick={onManageSheets} style={{ marginLeft: 'auto' }}>
          Manage Categories
        </button>
        {onOpenCurrencyConverter && (
          <button className="btn-ghost" onClick={onOpenCurrencyConverter} title="Open Currency Converter">
            💱 Currency
          </button>
        )}
        <button className="btn-ghost" onClick={onExportPDF}>
          Export PDF
        </button>'''
new_tb = '''        <div style={{ marginLeft: 'auto', display: 'inline-flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn-ghost btn-sm" onClick={collapseAllSections} title="Collapse all sections">
            Collapse all
          </button>
          <button type="button" className="btn-ghost btn-sm" onClick={expandAllSections} title="Expand all sections">
            Expand all
          </button>
          <button className="btn-ghost" onClick={onManageSheets}>
            Manage Categories
          </button>
          {onOpenCurrencyConverter && (
            <button className="btn-ghost" onClick={onOpenCurrencyConverter} title="Open Currency Converter">
              💱 Currency
            </button>
          )}
          <button className="btn-ghost" onClick={onExportPDF}>
            Export PDF
          </button>
        </div>'''
if 'Collapse all' not in p or 'collapseAllSections' not in p[p.find('toolbar'):p.find('toolbar')+800]:
    if old_tb in p:
        p = p.replace(old_tb, new_tb, 1)
        print('toolbar')
    else:
        print('toolbar WARN')
else:
    print('toolbar already')

# Sheet sections block
old_sec = '''      {/* Sheet Sections */}
      <div>
        {sheets
          .filter(s => !trip.hiddenSheets.includes(s.key))
          .map(s => {
            const items = trip.planItems.filter(i => i.sheet === s.key);
            const isCollapsed = collapsedSheets[s.key];

            return (
              <div className={`sheet-section ${items.length ? '' : 'is-empty'}`} key={s.key}>
                <div className="sheet-header">
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                    onClick={() => toggleSheet(s.key)}
                  >
                    <span>{isCollapsed ? '▸' : '▾'}</span>'''

new_sec = '''      {trip.hiddenSheets.length > 0 && (
        <div
          className="chart-card"
          style={{ marginBottom: '12px', padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--ink-soft)', fontWeight: 600 }}>
            Hidden categories
          </span>
          {trip.hiddenSheets.map(key => (
            <button
              key={key}
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => showSheet(key)}
              title={`Show “${key}” again`}
            >
              Show {key}
            </button>
          ))}
        </div>
      )}

      {/* Sheet Sections */}
      <div>
        <SortableList
          ids={visibleSheets.map(s => s.key)}
          onReorder={handleReorderSections}
          disabled={!onReorderSheets}
        >
        {visibleSheets.map(s => {
            const items = trip.planItems.filter(i => i.sheet === s.key);
            const isCollapsed = collapsedSheets[s.key];

            return (
              <SortableRow
                id={s.key}
                key={s.key}
                className={`sheet-section ${items.length ? '' : 'is-empty'}`}
                disabled={!onReorderSheets}
              >
                <div className="sheet-header">
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                    onClick={() => toggleSheet(s.key)}
                  >
                    {onReorderSheets ? <DragHandle /> : null}
                    <span>{isCollapsed ? '▸' : '▾'}</span>'''

if 'ids={visibleSheets.map' not in p:
    if old_sec in p:
        p = p.replace(old_sec, new_sec, 1)
        print('sections open')
    else:
        # try without special chevrons encoding
        print('sections open WARN')
        i = p.find('{/* Sheet Sections */}')
        print(repr(p[i:i+400]) if i>=0 else 'no marker')
else:
    print('sections open already')

# Header buttons: only + Add currently
old_add = '''                  <button className="btn-ghost btn-sm" onClick={() => onOpenAddPlanModal(s.key)}>
                    + Add
                  </button>
                </div>'''
new_add = '''                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={e => {
                        e.stopPropagation();
                        toggleSheet(s.key);
                      }}
                      title={isCollapsed ? 'Expand section' : 'Collapse section'}
                    >
                      {isCollapsed ? 'Expand' : 'Collapse'}
                    </button>
                    <button className="btn-ghost btn-sm" onClick={() => onOpenAddPlanModal(s.key)}>
                      + Add
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={e => {
                        e.stopPropagation();
                        hideSheet(s.key);
                      }}
                      title="Hide this category from Plan (quick — no menu)"
                    >
                      Hide
                    </button>
                  </div>
                </div>'''
if 'Hide this category from Plan' not in p:
    if old_add in p:
        p = p.replace(old_add, new_add, 1)
        print('header btns')
    else:
        print('header btns WARN')
else:
    print('header btns already')

# Close SortableRow / SortableList
old_end = '''                    ) : (
                      <div className="empty-state">Nothing here yet.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};'''
new_end = '''                    ) : (
                      <div className="empty-state">Nothing here yet.</div>
                    )}
                  </div>
                )}
              </SortableRow>
            );
          })}
        </SortableList>
      </div>
    </div>
  );
};'''
if p.count('</SortableList>') < 2 or 'visibleSheets.map' in p and '</SortableRow>' not in p[-800:]:
    if old_end in p:
        p = p.replace(old_end, new_end, 1)
        print('sections close')
    else:
        # try closing only outer sheet div
        if '              </div>\n            );\n          })}\n      </div>\n    </div>\n  );\n};' in p and 'visibleSheets.map' in p:
            p = p.replace(
                '              </div>\n            );\n          })}\n      </div>\n    </div>\n  );\n};',
                '              </SortableRow>\n            );\n          })}\n        </SortableList>\n      </div>\n    </div>\n  );\n};',
                1,
            )
            print('sections close alt')
        else:
            print('sections close WARN', repr(p[-350:]))
else:
    if '</SortableRow>' in p[-900:]:
        print('sections close already')
    elif old_end in p:
        p = p.replace(old_end, new_end, 1)
        print('sections close forced')

pp.write_text(p)

# TripDetailView — pass onReorderSheets to PlanTab
td = Path('src/components/TripDetailView.tsx')
t = td.read_text()
old_plan = '''            <PlanTab
              trip={trip}
              sheets={sheets}
              categories={categories}
              onRenameSheet={onRenameSheet}
              onRecolorSheet={onRecolorSheet}
              onUpdateTrip={onUpdateTrip}'''
new_plan = '''            <PlanTab
              trip={trip}
              sheets={sheets}
              categories={categories}
              onRenameSheet={onRenameSheet}
              onRecolorSheet={onRecolorSheet}
              onReorderSheets={onReorderSheets}
              onUpdateTrip={onUpdateTrip}'''
if 'onReorderSheets={onReorderSheets}' not in t[t.find('<PlanTab'):t.find('<PlanTab')+500]:
    if old_plan in t:
        t = t.replace(old_plan, new_plan, 1)
        td.write_text(t)
        print('TripDetail')
    else:
        print('TripDetail WARN')
else:
    print('TripDetail already')

print('done')
