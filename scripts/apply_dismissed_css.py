from pathlib import Path

BLOCK = '''

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

cp = Path('src/index.css')
c = cp.read_text()
if 'tr.row-dismissed' not in c:
    cp.write_text(c.rstrip() + BLOCK)
    print('css appended')
else:
    print('css present')

# Plan table rows
pp = Path('src/components/PlanTab.tsx')
p = pp.read_text()
if "className={i.status === 'cancelled'" not in p:
    p2 = p.replace(
        '{items.map(i => (\n                              <tr key={i.id}>',
        "{items.map(i => (\n                              <tr key={i.id} className={i.status === 'cancelled' ? 'is-cancelled row-dismissed' : ''}>",
        1,
    )
    if p2 == p:
        p2 = p.replace(
            '<tr key={i.id}>',
            "<tr key={i.id} className={i.status === 'cancelled' ? 'is-cancelled row-dismissed' : ''}>",
            1,
        )
    pp.write_text(p2)
    print('plan rows')
else:
    print('plan present')

# Research rows
rp = Path('src/components/ResearchTab.tsx')
r = rp.read_text()
if 'row-dismissed' not in r:
    r = r.replace(
        '<SortableRow as="tr" key={r.id} id={r.id}>',
        "<SortableRow as=\"tr\" key={r.id} id={r.id} className={r.status === 'dismissed' ? 'row-dismissed' : ''}>",
        1,
    )
    rp.write_text(r)
    print('research rows')
else:
    print('research present')
