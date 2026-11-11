from pathlib import Path
import urllib.request

# --- types.ts ---
url = 'https://raw.githubusercontent.com/Ello2003/Trip-Planner/459d907ca56488e61b14159d43688fe24697ea8d/src/types.ts'
t = urllib.request.urlopen(url, timeout=30).read().decode()
block = t[t.find('export interface PlanItem'):t.find('export interface ResearchItem')]
if 'priority' not in block:
    t = t.replace(
        '  notes: string;\n  visited: boolean;\n\n  actualNotes?: string;',
        '  notes: string;\n  visited: boolean;\n  /** Star priority 1-5 carried from Research when promoted */\n  priority?: number | null;\n\n  actualNotes?: string;',
        1,
    )
    print('types: added priority')
else:
    print('types: already has priority')
Path('src/types.ts').write_text(t)
assert 'export interface PlanItem' in t

# --- PlanTab.tsx ---
pt = Path('src/components/PlanTab.tsx').read_text()
if 'PRIORITY_LABELS' not in pt:
    pt = pt.replace(
        'export const PlanTab: React.FC<PlanTabProps> = ({',
        "const PRIORITY_LABELS: Record<number, string> = { 1: '★', 2: '★★', 3: '★★★', 4: '★★★★', 5: '★★★★★' };\n\nexport const PlanTab: React.FC<PlanTabProps> = ({",
        1,
    )
if 'i.priority' not in pt and '<strong>{i.name}</strong>' in pt:
    pt = pt.replace(
        '<strong>{i.name}</strong>',
        """<strong>{i.name}</strong>
                                  {i.priority ? (
                                    <div style={{ color: 'var(--brass)', fontSize: '12px', letterSpacing: '1px', marginTop: '2px' }} title=\"Priority\">
                                      {PRIORITY_LABELS[i.priority] || ''}
                                    </div>
                                  ) : null}""",
        1,
    )
    print('PlanTab table stars')
if 'item.priority' not in pt:
    needle = """                            <input
                              className=\"tl-name\"
                              value={item.name}
                              placeholder=\"What's happening\"
                              onChange={e => handleTimelineItemChange(item, 'name', e.target.value)}
                            />"""
    if needle in pt:
        pt = pt.replace(
            needle,
            needle + """
                            {item.priority ? (
                              <div style={{ color: 'var(--brass)', fontSize: '11px', letterSpacing: '1px', marginTop: '2px' }}>
                                {PRIORITY_LABELS[item.priority] || ''}
                              </div>
                            ) : null}""",
            1,
        )
        print('PlanTab timeline stars')
    else:
        print('WARN timeline needle')
Path('src/components/PlanTab.tsx').write_text(pt)

# --- App promote priority (idempotent) ---
app = Path('src/App.tsx').read_text()
old = 'visited: false,\n      estimateCategory: resolveExpenseCategory(item.sheet, state.categories)'
new = 'visited: false,\n      priority: item.priority ?? null,\n      estimateCategory: resolveExpenseCategory(item.sheet, state.categories)'
if old in app:
    app = app.replace(old, new)
    print('App promote priority')
elif 'priority: item.priority' in app:
    print('App already has priority on promote')
else:
    print('WARN promote')
old_m = 'priceLevel: null,\n      priority: null,\n      estCost: item.cost,'
new_m = 'priceLevel: null,\n      priority: item.priority ?? null,\n      estCost: item.cost,'
if old_m in app:
    app = app.replace(old_m, new_m, 1)
    print('App move priority')
Path('src/App.tsx').write_text(app)
print('done')
