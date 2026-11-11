from pathlib import Path
import re

# --- ResearchTab: add quick + button ---
rpath = Path('src/components/ResearchTab.tsx')
r = rpath.read_text()
if 'onQuickPromoteToPlan' not in r:
    r = r.replace(
        '  onPromoteToPlan: (item: ResearchItem) => void;',
        '  onPromoteToPlan: (item: ResearchItem) => void;\n  onQuickPromoteToPlan?: (item: ResearchItem) => void;',
        1,
    )
    r = r.replace(
        '  onPromoteToPlan,\n  onManageSheets,',
        '  onPromoteToPlan,\n  onQuickPromoteToPlan,\n  onManageSheets,',
        1,
    )
old = '''                                    {r.status !== 'promoted' && (
                                      <button className="btn-ghost btn-sm" onClick={() => onPromoteToPlan(r)} title="Promote to Plan" style={{ marginRight: '6px' }}>{'\\u2192 Plan'}</button>
                                    )}'''
# file may have either escaped or already-processed form
patterns = [
    ("title=\"Promote to Plan\" style={{ marginRight: '6px' }}", True),
]
if "Quick add to Plan" not in r:
    r2 = re.sub(
        r"\{r\.status !== 'promoted' && \(\s*<button className=\"btn-ghost btn-sm\" onClick=\{\(\) => onPromoteToPlan\(r\)\} title=\"Promote to Plan[^\"]*\" style=\{\{ marginRight: '6px' \}\}>[^<]*</button>\s*\)\}",
        '''{r.status !== 'promoted' && (
                                      <>
                                        <button
                                          className="exp-del"
                                          onClick={() => (onQuickPromoteToPlan ? onQuickPromoteToPlan(r) : onPromoteToPlan(r))}
                                          title="Quick add to Plan (no form)"
                                          style={{ marginRight: '4px' }}
                                        >
                                          {'\\u271A'}
                                        </button>
                                        <button className="btn-ghost btn-sm" onClick={() => onPromoteToPlan(r)} title="Promote to Plan (edit details)" style={{ marginRight: '6px' }}>{'\\u2192 Plan'}</button>
                                      </>
                                    )}''',
        r,
        count=1,
    )
    if r2 == r:
        print('WARN: Research button pattern not matched')
    else:
        r = r2
        print('ResearchTab buttons updated')
rpath.write_text(r)

# --- App.tsx: quick promote handler ---
import runpy
# reuse quick_promote.py if present
q = Path('scripts/quick_promote.py')
if q.exists():
    try:
        runpy.run_path(str(q))
    except SystemExit as e:
        print('quick_promote exit', e)
else:
    print('no quick_promote.py')

# Ensure TripDetail wires the prop
td = Path('src/components/TripDetailView.tsx')
t = td.read_text()
if 'onQuickPromoteToPlan={onQuickPromoteToPlan}' not in t:
    t = t.replace(
        'onPromoteToPlan={onPromoteToPlan}',
        'onPromoteToPlan={onPromoteToPlan}\n          onQuickPromoteToPlan={onQuickPromoteToPlan}',
        1,
    )
    if 'onQuickPromoteToPlan?:' not in t:
        t = t.replace(
            '  onPromoteToPlan: (item: ResearchItem) => void;',
            '  onPromoteToPlan: (item: ResearchItem) => void;\n  onQuickPromoteToPlan?: (item: ResearchItem) => void;',
            1,
        )
        t = t.replace(
            '  onPromoteToPlan,',
            '  onPromoteToPlan,\n  onQuickPromoteToPlan,',
            1,
        )
    td.write_text(t)
    print('TripDetailView wired')
print('done')
