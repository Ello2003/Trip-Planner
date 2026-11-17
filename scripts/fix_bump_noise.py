from pathlib import Path
import re

TYPES = Path('src/types.ts')
CL = Path('CHANGELOG.md')

# Clean the two noisy auto-summaries that included the history-fix commit itself
FIX = {
    '1.25.6': 'Version notes now summarise real commits and touched areas instead of generic Auto bump lines; 1.25.0–1.25.5 history rewritten with feature detail.',
    '1.25.7': 'Changelog history correction applied for 1.25.x (IndexedDB docs, Notes redesign, in-browser PDFs, versioning tooling).',
}

t = TYPES.read_text()
for ver, notes in FIX.items():
    esc = notes.replace("'", '\u2019')
    pat = rf"'{re.escape(ver)}':\s*'[^']*'"
    if re.search(pat, t):
        t = re.sub(pat, f"'{ver}': '{esc}'", t, count=1)
        print('types', ver)
TYPES.write_text(t)

blocks = {
    '1.25.6': '''## [1.25.6] - 2026-11-17

### Changed
- Auto version bumps now write **detailed notes** from recent commits and the areas of the app that changed.
- In-app and markdown changelog entries for **1.25.0–1.25.5** filled in with real feature descriptions (no more “Auto bump after …” placeholders).

---

''',
    '1.25.7': '''## [1.25.7] - 2026-11-17

### Changed
- Finished applying the corrected **1.25.x** release history (documents / IndexedDB, Notes cleanup, PDF viewer, version tooling).

---

''',
}

md = CL.read_text()
for ver, block in blocks.items():
    if f'[{ver}]' in md:
        md = re.sub(
            rf'## \[{re.escape(ver)}\][\s\S]*?(?=\n## \[|\Z)',
            block,
            md,
            count=1,
        )
        print('md', ver)
CL.write_text(md)

# Harden bump_version noise filter
bp = Path('scripts/bump_version.py')
b = bp.read_text()
old = '''def is_noise_commit(msg: str) -> bool:
    m = msg.strip().lower()
    return bool(
        re.match(r'^chore:\s*(bump|version)', m)
        or re.match(r'^chore:\s*meaningful version', m)
        or 'auto bump after' in m
        or m.startswith('merge ')
        or 'travel ledger sync' in m
    )'''
new = '''def is_noise_commit(msg: str) -> bool:
    m = msg.strip().lower()
    return bool(
        re.match(r'^chore:\s*(bump|version)', m)
        or re.match(r'^chore:\s*meaningful version', m)
        or re.match(r'^chore:\s*tidy .*notes', m)
        or re.match(r'^chore:\s*correct .*changelog', m)
        or 'auto bump after' in m
        or m.startswith('merge ')
        or 'travel ledger sync' in m
        or 'changelog history' in m
        or 'skip version' in m
    )'''
if old in b:
    b = b.replace(old, new, 1)
    bp.write_text(b)
    print('noise filter')
else:
    print('noise WARN')

print('done')
