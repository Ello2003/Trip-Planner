from pathlib import Path

# ---- storage: don't force manual order every load ----
sp = Path('src/utils/storage.ts')
s = sp.read_text()
old = '''    if (t.timelineMode === undefined || t.timelineMode === null) t.timelineMode = 'days';
    t.timelineMode = 'days';
    t.timelineManualOrder = true;'''
new = '''    if (t.timelineMode === undefined || t.timelineMode === null) t.timelineMode = 'days';
    if (t.timelineManualOrder === undefined) t.timelineManualOrder = false;'''
if old in s:
    s = s.replace(old, new, 1)
    sp.write_text(s)
    print('storage fixed')
elif 'if (t.timelineManualOrder === undefined)' in s:
    print('storage already')
else:
    # try softer match
    if 't.timelineManualOrder = true;' in s:
        s = s.replace(
            '''    if (t.timelineMode === undefined || t.timelineMode === null) t.timelineMode = 'days';
    t.timelineMode = 'days';
    t.timelineManualOrder = true;''',
            new,
            1,
        )
        if 't.timelineManualOrder = true;' in s:
            s = s.replace('    t.timelineManualOrder = true;', '    if (t.timelineManualOrder === undefined) t.timelineManualOrder = false;', 1)
            # still remove forced days if present alone
            s = s.replace("    t.timelineMode = 'days';\n", '', 1)
        sp.write_text(s)
        print('storage patched alt')
    else:
        print('storage WARN')

# ---- PlanTab: clear By time / Manual control ----
pp = Path('src/components/PlanTab.tsx')
p = pp.read_text()
old_btn = '''            <button
              className="btn-ghost btn-sm"
              onClick={() =>
                onUpdateTrip({
                  ...trip,
                  timelineManualOrder: !trip.timelineManualOrder,
                  updatedAt: Date.now()
                })
              }
            >
              {trip.timelineManualOrder ? 'Manual order' : 'Arrange manually'}
            </button>'''
new_btn = '''            <div className="timeline-toggle" style={{ display: 'inline-flex' }} title="Order stops within each day">
              <button
                type="button"
                className={`btn-sm ${!trip.timelineManualOrder ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() =>
                  onUpdateTrip({
                    ...trip,
                    timelineManualOrder: false,
                    updatedAt: Date.now()
                  })
                }
              >
                By time
              </button>
              <button
                type="button"
                className={`btn-sm ${trip.timelineManualOrder ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() =>
                  onUpdateTrip({
                    ...trip,
                    timelineManualOrder: true,
                    updatedAt: Date.now()
                  })
                }
              >
                Manual
              </button>
            </div>'''
if old_btn in p:
    p = p.replace(old_btn, new_btn, 1)
    print('PlanTab toggle')
elif 'By time' in p and 'timelineManualOrder: false' in p:
    print('PlanTab already')
else:
    print('PlanTab WARN')
    # find Arrange manually
    if 'Arrange manually' in p or 'Manual order' in p:
        print('found labels')

pp.write_text(p)
print('done')
