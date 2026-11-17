from pathlib import Path
import re

# ---- uiPrefs: notes collapse / hidden ----
up = Path('src/utils/uiPrefs.ts')
u = up.read_text()
if 'notesCollapsed' not in u:
    u = u.replace(
        '  researchExpandedMaps?: Record<string, boolean>;\n};',
        '  researchExpandedMaps?: Record<string, boolean>;\n  notesCollapsed?: Record<string, boolean>;\n  notesHiddenSections?: string[];\n};',
        1,
    )
    up.write_text(u)
    print('uiPrefs')
else:
    print('uiPrefs already')

# ---- storage: strip pins & practical on load ----
sp = Path('src/utils/storage.ts')
s = sp.read_text()
old = '''    if (!Array.isArray(tn.pins)) tn.pins = [];
    if (!tn.practical || typeof tn.practical !== 'object') tn.practical = emptyTripNotes().practical;
    if (!Array.isArray(tn.practical.apps)) tn.practical.apps = [];
    if (typeof tn.practical.currency !== 'string') tn.practical.currency = '';
    if (typeof tn.practical.emergency !== 'string') tn.practical.emergency = '';
    if (!['', 'low', 'medium', 'high'].includes(tn.practical.safety)) tn.practical.safety = '';'''
new = '''    // Geo-pins and practicality removed from Notes — clear on every load
    tn.pins = [];
    tn.practical = { currency: '', safety: '', emergency: '', apps: [] };'''
if old in s:
    s = s.replace(old, new, 1)
    sp.write_text(s)
    print('storage strip')
elif 'Geo-pins and practicality removed' in s:
    print('storage already')
else:
    print('storage WARN')

# ---- helpers emptyTripNotes still has empty pins/practical for type compat ----
# leave as-is

# ---- CSS tidy notes fonts & remove icon-btn emphasis ----
cp = Path('src/index.css')
c = cp.read_text()

# Tidy notes-tab typography block if present
if 'notes-collapse-btn' not in c:
    extra = '''
/* Notes tab — typography & section chrome */
#travel-ledger-root .notes-tab {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 720px;
}
#travel-ledger-root .notes-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
#travel-ledger-root .notes-collapse-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  color: inherit;
  text-align: left;
  min-width: 0;
}
#travel-ledger-root .notes-collapse-btn h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: 0.01em;
  color: var(--ink);
  font-family: var(--font-display, inherit);
}
#travel-ledger-root .notes-chevron {
  font-size: 11px;
  color: var(--ink-soft);
  width: 12px;
  text-align: center;
}
#travel-ledger-root .notes-count {
  margin-left: 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  color: var(--ink-soft);
}
#travel-ledger-root .notes-head-actions { display: flex; gap: 6px; flex-shrink: 0; }
#travel-ledger-root .notes-text-btn {
  font-size: 12px;
  padding: 4px 8px;
}
#travel-ledger-root .notes-text-btn.danger { color: var(--red); }
#travel-ledger-root .notes-card.is-collapsed .notes-card-head { margin-bottom: 0; }
#travel-ledger-root .notes-restore {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 2px;
}
#travel-ledger-root .notes-text {
  font-size: 14px;
  line-height: 1.55;
  letter-spacing: 0.01em;
}
#travel-ledger-root .notes-why {
  font-size: 13px;
  line-height: 1.5;
}
#travel-ledger-root .notes-input {
  font-size: 14px;
  line-height: 1.45;
}
#travel-ledger-root .notes-docs-wrap .chart-card {
  margin-top: 0;
  border: none;
  padding: 0;
  background: transparent;
  box-shadow: none;
}
#travel-ledger-root .notes-docs-wrap .chart-card h3 { display: none; }
'''
    # append before media query for notes or at end of notes section
    if '@media (max-width: 720px) {\n  #travel-ledger-root .notes-card' in c:
        c = c.replace(
            '@media (max-width: 720px) {\n  #travel-ledger-root .notes-card',
            extra + '\n@media (max-width: 720px) {\n  #travel-ledger-root .notes-card',
            1,
        )
    else:
        c += extra
    cp.write_text(c)
    print('css')
else:
    print('css already')

# Soft-hide icon button style usage leftover - leave CSS for safety

print('done')
