from pathlib import Path

pt = Path('src/components/PlanTab.tsx')
text = pt.read_text()

if 'const PriorityStars' not in text:
    helper_end = '''  return null;\n};\n\nexport const PlanTab'''
    insert = '''  return null;\n};\n\n/** Inline 1-5 star control; click same star again to clear */\nconst PriorityStars: React.FC<{\n  value: number | null;\n  onChange: (n: number | null) => void;\n  size?: number;\n}> = ({ value, onChange, size = 14 }) => {\n  const v = value != null && value >= 1 && value <= 5 ? value : 0;\n  return (\n    <span\n      role="group"\n      aria-label="Priority rating"\n      style={{ display: 'inline-flex', gap: '1px', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}\n      onClick={e => e.stopPropagation()}\n    >\n      {[1, 2, 3, 4, 5].map(n => (\n        <button\n          key={n}\n          type="button"\n          title={n === v ? `Clear priority (${n}/5)` : `Set priority ${n}/5`}\n          onClick={() => onChange(n === v ? null : n)}\n          style={{\n            border: 'none',\n            background: 'transparent',\n            padding: '0 1px',\n            margin: 0,\n            cursor: 'pointer',\n            fontSize: size,\n            lineHeight: 1,\n            color: n <= v ? 'var(--ochre, var(--brass))' : 'var(--paper-edge)',\n            fontWeight: n <= v ? 700 : 400\n          }}\n        >\n          ★\n        </button>\n      ))}\n    </span>\n  );\n};\n\nexport const PlanTab'''
    if helper_end not in text:
        raise SystemExit('helper end missing')
    text = text.replace(helper_end, insert, 1)
    print('PriorityStars')
else:
    print('PriorityStars exists')

if 'handleSetPriority' not in text:
    anchor = "  const handleTimelineItemChange = (item: PlanItem, field: 'time' | 'name' | 'notes', val: string) => {"
    handler = '''  const handleSetPriority = (item: PlanItem, priority: number | null) => {
    const updatedPlan = trip.planItems.map(p =>
      p.id === item.id ? { ...p, priority } : p
    );
    onUpdateTrip({
      ...trip,
      planItems: updatedPlan,
      updatedAt: Date.now()
    });
  };

  const handleTimelineItemChange = (item: PlanItem, field: 'time' | 'name' | 'notes', val: string) => {'''
    if anchor not in text:
        raise SystemExit('handler anchor missing')
    text = text.replace(anchor, handler, 1)
    print('handler')
else:
    print('handler exists')

old_cell = '''                                <td style={{ whiteSpace: 'nowrap', color: 'var(--ochre, var(--brass))', letterSpacing: '1px', fontWeight: 600, fontSize: '13px' }}>
                                  {(() => { const pr = planPriority(i, trip.research || []); return pr ? PRIORITY_LABELS[pr] : '—'; })()}
                                </td>'''
new_cell = '''                                <td style={{ whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                                  <PriorityStars
                                    value={planPriority(i, trip.research || [])}
                                    onChange={n => handleSetPriority(i, n)}
                                  />
                                </td>'''
if old_cell in text:
    text = text.replace(old_cell, new_cell, 1)
    print('column')
elif '<PriorityStars' in text and 'handleSetPriority(i' in text:
    print('column ok')
else:
    print('column WARN')

old_tl = '''                            {(() => {
                              const pr = planPriority(item, trip.research || []);
                              return pr ? (
                                <div style={{ color: 'var(--ochre, var(--brass))', fontSize: '13px', letterSpacing: '2px', marginTop: '3px', fontWeight: 600 }} title={`Priority ${pr}/5`}>
                                  {PRIORITY_LABELS[pr]}
                                </div>
                              ) : null;
                            })()}'''
new_tl = '''                            <div style={{ marginTop: '4px' }}>
                              <PriorityStars
                                value={planPriority(item, trip.research || [])}
                                onChange={n => handleSetPriority(item, n)}
                                size={13}
                              />
                            </div>'''
if old_tl in text:
    text = text.replace(old_tl, new_tl, 1)
    print('timeline')
elif 'handleSetPriority(item' in text:
    print('timeline ok')
else:
    print('timeline WARN')

# Remove static under-name stars if present
old_name = '''                                  {(() => {
                                    const pr = planPriority(i, trip.research || []);
                                    return pr ? (
                                      <div style={{ color: 'var(--ochre, var(--brass))', fontSize: '13px', letterSpacing: '2px', marginTop: '3px', fontWeight: 600 }} title={`Priority ${pr}/5`}>
                                        {PRIORITY_LABELS[pr]}
                                      </div>
                                    ) : null;
                                  })()}'''
if old_name in text:
    text = text.replace(old_name, '', 1)
    print('removed under-name')

pt.write_text(text)
print('done')
