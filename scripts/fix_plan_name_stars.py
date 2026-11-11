from pathlib import Path
pt = Path('src/components/PlanTab.tsx').read_text()
old = '''                                  {i.priority ? (
                                    <div style={{ color: 'var(--brass)', fontSize: '12px', letterSpacing: '1px', marginTop: '2px' }} title="Priority">
                                      {PRIORITY_LABELS[i.priority] || ''}
                                    </div>
                                  ) : null}'''
new = '''                                  {(() => {
                                    const pr = planPriority(i, trip.research || []);
                                    return pr ? (
                                      <div style={{ color: 'var(--ochre, var(--brass))', fontSize: '13px', letterSpacing: '2px', marginTop: '3px', fontWeight: 600 }} title={`Priority ${pr}/5`}>
                                        {PRIORITY_LABELS[pr]}
                                      </div>
                                    ) : null;
                                  })()}'''
if old in pt:
    pt = pt.replace(old, new, 1)
    Path('src/components/PlanTab.tsx').write_text(pt)
    print('updated under-name')
elif 'planPriority(i, trip.research' in pt:
    print('already ok')
else:
    print('pattern missing')
