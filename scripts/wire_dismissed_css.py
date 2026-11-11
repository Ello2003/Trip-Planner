from pathlib import Path

# Import stylesheet from index.css
idx = Path('src/index.css')
c = idx.read_text()
if "dismissed-rows.css" not in c:
    # prepend import after any existing imports or at top
    if c.lstrip().startswith('@import'):
        # after last import line
        lines = c.splitlines(keepends=True)
        last_imp = 0
        for i, line in enumerate(lines):
            if line.startswith('@import'):
                last_imp = i
        lines.insert(last_imp + 1, "@import './dismissed-rows.css';\n")
        idx.write_text(''.join(lines))
    else:
        idx.write_text("@import './dismissed-rows.css';\n\n" + c)
    print('import added')
else:
    print('import present')

# Research class
rp = Path('src/components/ResearchTab.tsx')
r = rp.read_text()
if 'row-dismissed' not in r:
    r = r.replace(
        '<SortableRow as="tr" key={r.id} id={r.id}>',
        "<SortableRow as=\"tr\" key={r.id} id={r.id} className={r.status === 'dismissed' ? 'row-dismissed' : ''}>",
        1,
    )
    rp.write_text(r)
    print('research class')
else:
    print('research present')
