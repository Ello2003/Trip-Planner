from pathlib import Path

cp = Path('src/index.css')
c = cp.read_text()

# 1) notes-card-head h3: match chart-card h3 (Budget)
old_h3 = '''#travel-ledger-root .notes-card-head h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
  font-size: 16px;
  color: var(--ink);
}'''
new_h3 = '''#travel-ledger-root .notes-card-head h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--ink-soft);
  font-weight: 600;
}'''
if old_h3 in c:
    c = c.replace(old_h3, new_h3, 1)
    print('notes-card-head h3')
elif 'notes-card-head h3' in c and 'text-transform: uppercase' in c[c.find('notes-card-head h3'):c.find('notes-card-head h3')+300]:
    print('notes-card-head h3 already')
else:
    print('notes-card-head h3 WARN')

# 2) collapse button h3 override block
old_col = '''#travel-ledger-root .notes-collapse-btn h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: 0.01em;
  color: var(--ink);
  font-family: var(--font-display, inherit);
}'''
new_col = '''#travel-ledger-root .notes-collapse-btn h3 {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--ink-soft);
}'''
if old_col in c:
    c = c.replace(old_col, new_col, 1)
    print('collapse h3')
else:
    # partial replace if slightly different
    if 'notes-collapse-btn h3' in c and 'font-display' in c[c.find('notes-collapse-btn h3'):c.find('notes-collapse-btn h3')+250]:
        import re
        c, n = re.subn(
            r'#travel-ledger-root \.notes-collapse-btn h3 \{[^}]+\}',
            new_col.strip(),
            c,
            count=1,
        )
        print('collapse h3 re', n)
    else:
        print('collapse already or WARN')

# 3) Body text sizes → Budget-like (13px body, not 14px)
replacements = [
    ('''#travel-ledger-root .notes-text {
  font-size: 14px;
  line-height: 1.55;
  letter-spacing: 0.01em;
}''',
     '''#travel-ledger-root .notes-text {
  font-family: var(--font-body);
  font-size: 13px;
  line-height: 1.5;
  letter-spacing: normal;
  color: var(--ink);
}'''),
    ('''#travel-ledger-root .notes-why {
  font-size: 13px;
  line-height: 1.5;
}''',
     '''#travel-ledger-root .notes-why {
  font-family: var(--font-body);
  font-size: 12px;
  line-height: 1.45;
  color: var(--ink-soft);
}'''),
    ('''#travel-ledger-root .notes-input {
  font-size: 14px;
  line-height: 1.45;
}''',
     '''#travel-ledger-root .notes-input {
  font-family: var(--font-body);
  font-size: 13px;
  line-height: 1.45;
}'''),
]
for old, new in replacements:
    if old in c:
        c = c.replace(old, new, 1)
        print('replaced body rule')
    else:
        print('skip body rule')

# Base notes-input (first definition) ensure body font 13px
old_in = '''#travel-ledger-root .notes-input {
  width: 100%;
  min-width: 0;
  padding: 9px 11px;
  font-family: inherit;
  font-size: 13px;
  color: var(--ink);
  background: #fff;
  border: 1px solid var(--paper-edge);
  border-radius: 5px;
}'''
new_in = '''#travel-ledger-root .notes-input {
  width: 100%;
  min-width: 0;
  padding: 9px 11px;
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--ink);
  background: #fff;
  border: 1px solid var(--paper-edge);
  border-radius: 5px;
}'''
if old_in in c:
    c = c.replace(old_in, new_in, 1)
    print('notes-input base')

# notes-text first definition if still 13.5
c = c.replace(
    '#travel-ledger-root .notes-text { font-size: 13.5px; line-height: 1.5; color: var(--ink); white-space: pre-wrap; overflow-wrap: anywhere; }',
    '#travel-ledger-root .notes-text { font-family: var(--font-body); font-size: 13px; line-height: 1.5; color: var(--ink); white-space: pre-wrap; overflow-wrap: anywhere; }',
    1,
)

# notes-count badge — align with budget mono labels
old_count = '''#travel-ledger-root .notes-count {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--line);
  color: var(--ink-soft);
}'''
# keep as is — already mono

# Global: section cards in tabs share Budget heading style
if '/* Unified section headings (Budget style) */' not in c:
    c += '''

/* Unified section headings (Budget style) */
#travel-ledger-root .sheet-header,
#travel-ledger-root .sheet-header .inline-text,
#travel-ledger-root .sheet-header span:not(.sheet-dot) {
  font-family: var(--font-body);
}
#travel-ledger-root .notes-tab,
#travel-ledger-root .notes-tab button:not(.btn-primary):not(.btn-ghost),
#travel-ledger-root .notes-tab input,
#travel-ledger-root .notes-tab textarea {
  font-family: var(--font-body);
}
#travel-ledger-root .notes-meta,
#travel-ledger-root .notes-hint,
#travel-ledger-root .notes-count {
  font-family: var(--font-mono);
}
'''
    print('global unify')

cp.write_text(c)
print('done')
