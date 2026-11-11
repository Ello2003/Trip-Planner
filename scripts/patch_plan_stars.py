from pathlib import Path

pt = Path('src/components/PlanTab.tsx').read_text()

if 'const planPriority' not in pt:
    pt = pt.replace(
        "const PRIORITY_LABELS: Record<number, string> = { 1: '★', 2: '★★', 3: '★★★', 4: '★★★★', 5: '★★★★★' };\n\nexport const PlanTab",
        '''const PRIORITY_LABELS: Record<number, string> = { 1: '\u2605', 2: '\u2605\u2605', 3: '\u2605\u2605\u2605', 4: '\u2605\u2605\u2605\u2605', 5: '\u2605\u2605\u2605\u2605\u2605' };\n\n/** Prefer plan item priority; fall back to linked Research row */\nconst planPriority = (item: { id: string; priority?: number | null }, research: { linkedPlanItemId?: string | null; priority?: number | null }[]): number | null => {\n  const raw = item.priority != null ? Number(item.priority) : NaN;\n  if (Number.isFinite(raw) && raw >= 1 && raw <= 5) return raw;\n  const linked = research.find(r => r.linkedPlanItemId === item.id);\n  if (linked?.priority != null) {\n    const n = Number(linked.priority);\n    if (Number.isFinite(n) && n >= 1 && n <= 5) return n;\n  }\n  return null;\n};\n\nexport const PlanTab''',
        1,
    )
    # real stars
    pt = pt.replace("\\u2605", "★")
    print('helper')

# Force unicode stars in PRIORITY_LABELS if broken
if "'\u2605'" in pt or '\\u2605' in pt:
    pt = pt.replace(
        "const PRIORITY_LABELS: Record<number, string> = { 1: '\\u2605', 2: '\\u2605\\u2605', 3: '\\u2605\\u2605\\u2605', 4: '\\u2605\\u2605\\u2605\\u2605', 5: '\\u2605\\u2605\\u2605\\u2605\\u2605' };",
        "const PRIORITY_LABELS: Record<number, string> = { 1: '★', 2: '★★', 3: '★★★', 4: '★★★★', 5: '★★★★★' };",
    )

# Header Priority column
if '>Priority</th>' not in pt:
    pt = pt.replace(
        '''                              <th style={{ width: '32%' }}>Name</th>
                              <th style={{ width: '14%' }}>Status</th>
                              <th style={{ width: '18%' }}>When</th>
                              <th style={{ width: '14%' }} className="num">Cost</th>
                              <th style={{ width: '22%' }}></th>''',
        '''                              <th style={{ width: '28%' }}>Name</th>
                              <th style={{ width: '12%' }}>Priority</th>
                              <th style={{ width: '12%' }}>Status</th>
                              <th style={{ width: '16%' }}>When</th>
                              <th style={{ width: '12%' }} className="num">Cost</th>
                              <th style={{ width: '20%' }}></th>''',
        1,
    )
    print('header')

# Priority cell before status
if "PRIORITY_LABELS[pr] : '—'" not in pt and 'PRIORITY_LABELS[pr] : "—"' not in pt:
    needle = '''                                <td>
                                  <span
                                    className={`status-chip status-${
                                      i.status === 'booked'
                                        ? 'completed'
                                        : i.status === 'cancelled'
                                        ? 'cancelled'
                                        : 'upcoming'
                                    }`}
                                  >
                                    {i.status}
                                  </span>
                                </td>'''
    insert = '''                                <td style={{ whiteSpace: 'nowrap', color: 'var(--ochre, var(--brass))', letterSpacing: '1px', fontWeight: 600, fontSize: '13px' }}>
                                  {(() => { const pr = planPriority(i, trip.research || []); return pr ? PRIORITY_LABELS[pr] : '\u2014'; })()}
                                </td>
                                <td>
                                  <span
                                    className={`status-chip status-${
                                      i.status === 'booked'
                                        ? 'completed'
                                        : i.status === 'cancelled'
                                        ? 'cancelled'
                                        : 'upcoming'
                                    }`}
                                  >
                                    {i.status}
                                  </span>
                                </td>'''
    if needle in pt:
        pt = pt.replace(needle, insert, 1)
        print('cell')
    else:
        print('WARN status needle')

# Improve under-name stars to use planPriority
if 'planPriority(i, trip.research' not in pt:
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
        print('name stars')

if 'planPriority(item, trip.research' not in pt:
    old = '''                            {item.priority ? (
                              <div style={{ color: 'var(--brass)', fontSize: '11px', letterSpacing: '1px', marginTop: '2px' }}>
                                {PRIORITY_LABELS[item.priority] || ''}
                              </div>
                            ) : null}'''
    new = '''                            {(() => {
                              const pr = planPriority(item, trip.research || []);
                              return pr ? (
                                <div style={{ color: 'var(--ochre, var(--brass))', fontSize: '13px', letterSpacing: '2px', marginTop: '3px', fontWeight: 600 }} title={`Priority ${pr}/5`}>
                                  {PRIORITY_LABELS[pr]}
                                </div>
                              ) : null;
                            })()}'''
    if old in pt:
        pt = pt.replace(old, new, 1)
        print('timeline stars')

Path('src/components/PlanTab.tsx').write_text(pt)
print('done', pt.count('planPriority'))
