from pathlib import Path

rp = Path('src/components/ResearchTab.tsx')
r = rp.read_text()

if 'hideSheet' in r and 'Show hidden' not in r and 'hiddenSheets.map' in r:
    print('maybe partial')

# Add helpers after toggleSheet if missing
if 'const hideSheet' not in r:
    anchor = '''  const toggleSheet = (key: string) => {
    setCollapsedSheets(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveTripUi(trip.id, { researchCollapsedSheets: next });
      return next;
    });
  };'''
    # read actual toggleSheet from file
    import re
    m = re.search(r'  const toggleSheet = \(key: string\) => \{[\s\S]*?\n  \};', r)
    if not m:
        raise SystemExit('toggleSheet not found')
    insert = m.group(0) + '''

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
    const next: Record<string, boolean> = {};
    visibleSheets.forEach(s => {
      next[s.key] = true;
    });
    setCollapsedSheets(next);
    saveTripUi(trip.id, { researchCollapsedSheets: next });
  };

  const expandAllSections = () => {
    const next: Record<string, boolean> = {};
    visibleSheets.forEach(s => {
      next[s.key] = false;
    });
    setCollapsedSheets(next);
    saveTripUi(trip.id, { researchCollapsedSheets: next });
  };'''
    # Problem: visibleSheets is defined later. Move helpers after visibleSheets or use sheets filter inline.
    insert = m.group(0) + '''

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
    saveTripUi(trip.id, { researchCollapsedSheets: next });
  };

  const expandAllSections = () => {
    const keys = sheets.filter(s => !trip.hiddenSheets.includes(s.key)).map(s => s.key);
    const next: Record<string, boolean> = { ...collapsedSheets };
    keys.forEach(k => {
      next[k] = false;
    });
    setCollapsedSheets(next);
    saveTripUi(trip.id, { researchCollapsedSheets: next });
  };'''
    r = r[:m.start()] + insert + r[m.end():]
    print('helpers')
else:
    print('helpers exist')

# Toolbar: add collapse all / expand all before Manage Categories
old_tb = '''        <button className="btn-ghost btn-sm" onClick={onManageSheets} style={{ marginLeft: 'auto' }}>Manage Categories</button>
        <button className="btn-ghost btn-sm" onClick={onOpenMapSettings}>Maps Key</button>'''
new_tb = '''        <div style={{ marginLeft: 'auto', display: 'inline-flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn-ghost btn-sm" onClick={collapseAllSections} title="Collapse all sections">Collapse all</button>
          <button type="button" className="btn-ghost btn-sm" onClick={expandAllSections} title="Expand all sections">Expand all</button>
          <button className="btn-ghost btn-sm" onClick={onManageSheets}>Manage Categories</button>
          <button className="btn-ghost btn-sm" onClick={onOpenMapSettings}>Maps Key</button>
        </div>'''
if 'Collapse all' not in r:
    if old_tb in r:
        r = r.replace(old_tb, new_tb, 1)
        print('toolbar')
    else:
        print('toolbar WARN')
else:
    print('toolbar already')

# Section header: Hide button
old_btns = '''                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn-ghost btn-sm" onClick={() => toggleSectionMap(s.key)} title={hasMap ? 'Show/hide map' : 'Add a map'} style={hasMap ? { borderColor: 'var(--brass)', color: 'var(--brass)' } : undefined}>Map</button>
                    <button className="btn-ghost btn-sm" onClick={() => onOpenAddResearchModal(s.key)}>+ Add</button>
                  </div>'''
new_btns = '''                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
                    <button className="btn-ghost btn-sm" onClick={() => toggleSectionMap(s.key)} title={hasMap ? 'Show/hide map' : 'Add a map'} style={hasMap ? { borderColor: 'var(--brass)', color: 'var(--brass)' } : undefined}>Map</button>
                    <button className="btn-ghost btn-sm" onClick={() => onOpenAddResearchModal(s.key)}>+ Add</button>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={e => {
                        e.stopPropagation();
                        hideSheet(s.key);
                      }}
                      title="Hide this category from Research (quick — no menu)"
                    >
                      Hide
                    </button>
                  </div>'''
if 'Hide this category from Research' not in r:
    if old_btns in r:
        r = r.replace(old_btns, new_btns, 1)
        print('section btns')
    else:
        print('section btns WARN')
else:
    print('section btns already')

# Hidden categories strip after toolbar / before map
marker = '''      {(researchView === 'both' || researchView === 'map') && ('''
hidden_bar = '''      {trip.hiddenSheets.length > 0 && (
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

      {(researchView === 'both' || researchView === 'map') && ('''
if 'Hidden categories' not in r:
    if marker in r:
        r = r.replace(marker, hidden_bar, 1)
        print('hidden bar')
    else:
        print('hidden bar WARN')
else:
    print('hidden bar already')

rp.write_text(r)
print('done')
