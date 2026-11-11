from pathlib import Path
import re

# types
t = Path('src/types.ts').read_text()
if 'WILL_READ' in t or len(t) < 1000:
    import urllib.request
    t = urllib.request.urlopen('https://raw.githubusercontent.com/Ello2003/Trip-Planner/459d907ca56488e61b14159d43688fe24697ea8d/src/types.ts', timeout=30).read().decode()
    print('restored types from good commit')

m = re.search(r'(export interface PlanItem \{[\s\S]*?visited: boolean;)(\n\n  actualNotes)', t)
if m and 'priority?:' not in m.group(0):
    t = t[:m.end(1)] + '\n  /** Star priority 1-5 carried from Research when promoted */\n  priority?: number | null;' + m.group(2) + t[m.end(2):]
    print('types priority inserted')
elif 'priority?:' in t[t.find('PlanItem'):t.find('ResearchItem')]:
    print('types already ok')
else:
    print('types WARN')
Path('src/types.ts').write_text(t)

# App
app = Path('src/App.tsx').read_text()
count = 0
needle = 'visited: false,\n      estimateCategory: resolveExpenseCategory(item.sheet, state.categories)'
repl = 'visited: false,\n      priority: item.priority ?? null,\n      estimateCategory: resolveExpenseCategory(item.sheet, state.categories)'
while needle in app:
    app = app.replace(needle, repl, 1)
    count += 1
print('App promote replacements', count)
app = app.replace(
    'priceLevel: null,\n      priority: null,\n      estCost: item.cost,',
    'priceLevel: null,\n      priority: item.priority ?? null,\n      estCost: item.cost,',
    1,
)
Path('src/App.tsx').write_text(app)

# PlanTab
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
        "<strong>{i.name}</strong>\n                                  {i.priority ? (\n                                    <div style={{ color: 'var(--brass)', fontSize: '12px', letterSpacing: '1px', marginTop: '2px' }} title=\"Priority\">\n                                      {PRIORITY_LABELS[i.priority] || ''}\n                                    </div>\n                                  ) : null}",
        1,
    )
    print('table stars')
if 'item.priority' not in pt and 'className="tl-name"' in pt:
    i = pt.find('className="tl-name"')
    j = pt.find('/>', i)
    insert_at = j + 2
    snippet = "\n                            {item.priority ? (\n                              <div style={{ color: 'var(--brass)', fontSize: '11px', letterSpacing: '1px', marginTop: '2px' }}>\n                                {PRIORITY_LABELS[item.priority] || ''}\n                              </div>\n                            ) : null}"
    pt = pt[:insert_at] + snippet + pt[insert_at:]
    print('timeline stars')
Path('src/components/PlanTab.tsx').write_text(pt)
print('done')
