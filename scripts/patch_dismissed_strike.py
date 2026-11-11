from pathlib import Path
import re

# Research
rp = Path('src/components/ResearchTab.tsx')
r = rp.read_text()
old = '<SortableRow as="tr" key={r.id} id={r.id}>'
new = "<SortableRow as=\"tr\" key={r.id} id={r.id} className={r.status === 'dismissed' ? 'row-dismissed' : ''} >"
if old in r and 'row-dismissed' not in r:
    r = r.replace(old, new, 1)
    rp.write_text(r)
    print('research')
elif 'row-dismissed' in r:
    print('research already')
else:
    print('research WARN')

# Plan table
pp = Path('src/components/PlanTab.tsx')
p = pp.read_text()
oldp = "{items.map(i => (\n                              <tr key={i.id}>"
newp = "{items.map(i => (\n                              <tr key={i.id} className={i.status === 'cancelled' ? 'is-cancelled row-dismissed' : ''} >"
if oldp in p and "row-dismissed' : ''}" not in p:
    p = p.replace(oldp, newp, 1)
    pp.write_text(p)
    print('plan')
elif 'row-dismissed' in p:
    print('plan already')
else:
    print('plan WARN')

# CSS
cp = Path('src/index.css')
c = cp.read_text()
if 'row-dismissed' not in c:
    block = '''
/* Full-row strikethrough when Research dismissed / Plan cancelled */
#travel-ledger-root .tl-row.is-cancelled,
#travel-ledger-root tr.row-dismissed,
#travel-ledger-root tr.is-cancelled {
  opacity: 0.55;
}
#travel-ledger-root .tl-row.is-cancelled .tl-time,
#travel-ledger-root .tl-row.is-cancelled .tl-name,
#travel-ledger-root .tl-row.is-cancelled .tl-notes,
#travel-ledger-root .tl-row.is-cancelled .tl-sheet-tag,
#travel-ledger-root tr.row-dismissed td,
#travel-ledger-root tr.is-cancelled td {
  text-decoration: line-through;
}
#travel-ledger-root .tl-row.is-cancelled .tl-reorder-cell,
#travel-ledger-root tr.row-dismissed td:last-child,
#travel-ledger-root tr.is-cancelled td:last-child {
  text-decoration: none;
}
'''
    if '#travel-ledger-root .tl-row.is-cancelled {\n  opacity: .45;\n}' in c:
        c = c.replace(
            '#travel-ledger-root .tl-row.is-cancelled {\n  opacity: .45;\n}',
            block.strip(),
            1,
        )
    else:
        c += '\n' + block
    cp.write_text(c)
    print('css')
else:
    print('css already')
print('done')
