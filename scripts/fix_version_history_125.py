"""Rewrite generic 1.25.x auto-bump notes with real change summaries."""
from pathlib import Path
import re
from datetime import date

TYPES = Path('src/types.ts')
CL = Path('CHANGELOG.md')

HISTORY = {
    '1.25.5': (
        'Trip documents stored in IndexedDB (up to ~40 MB each) instead of base64 in localStorage; '
        'legacy uploads migrate automatically; trip saves keep metadata only; optional cloudUrl field for future cross-device files.'
    ),
    '1.25.4': (
        'Notes section polish follow-up: collapse/remove persistence wiring and stylesheet refinements for the cleaned Notes tab.'
    ),
    '1.25.3': (
        'Notes tab redesign: calmer typography, text actions instead of emoji icons, collapsible and removable sections; '
        'geo-pins and practicality removed for all trips going forward.'
    ),
    '1.25.2': (
        'PDFs (and other viewable uploads) open in a new browser tab via blob URLs; separate Download control retained.'
    ),
    '1.25.1': (
        'Versioning tooling: APP_VERSION / package.json / CHANGELOG kept in sync, with automated patch bumps on main.'
    ),
    '1.25.0': (
        'Document uploads on Budget and Notes; Research category sections drag-reorder; Plan timeline By time or Manual; '
        'hour-by-hour only shows timed items; inline star priority on Plan; dismissed rows strikethrough; '
        'collapsed sections and views persist; tab bar shows only known enabled tabs including Notes.'
    ),
}

MD_BLOCKS = {
    '1.25.5': '''## [1.25.5] - 2026-11-17

### Added
- **IndexedDB document store** for Budget and Notes uploads (about 40 MB per file).
- Automatic **migration** of older base64 uploads into IndexedDB.

### Changed
- Trip JSON / localStorage keeps **file metadata only** (name, size, type) so saves stay small.
- Open and Download load the binary from IndexedDB (or legacy data / cloud URL when present).

---

''',
    '1.25.4': '''## [1.25.4] - 2026-11-17

### Changed
- Notes collapse/remove preferences and related styling follow-up after the Notes redesign.

---

''',
    '1.25.3': '''## [1.25.3] - 2026-11-17

### Changed
- Notes typography cleaned up; emoji / icon-only actions replaced with text controls.
- Journal, Links, and Documents sections can be **collapsed** or **removed** (and restored) per trip.

### Removed
- **Geo-pins** and **practicality** blocks from Notes for existing and new trips.

---

''',
    '1.25.2': '''## [1.25.2] - 2026-11-17

### Changed
- **Open** on PDF uploads uses the browser PDF viewer in a new tab (blob URL).
- Images and text open in-browser; **Download** remains available for every file.

---

''',
    '1.25.1': '''## [1.25.1] - 2026-11-17

### Added
- Shared **bump_version** script and CI workflow so each main change can ship with a version and changelog entry.

---

''',
}

t = TYPES.read_text()
for ver, notes in HISTORY.items():
    esc = notes.replace("'", '\u2019')
    pat = rf"'{re.escape(ver)}':\s*'[^']*'"
    if re.search(pat, t):
        t = re.sub(pat, f"'{ver}': '{esc}'", t, count=1)
        print('types', ver)
    else:
        print('types missing', ver)
TYPES.write_text(t)

md = CL.read_text() if CL.exists() else '# Changelog\n\n---\n\n'
for ver, block in MD_BLOCKS.items():
    if f'[{ver}]' in md:
        md = re.sub(
            rf'## \[{re.escape(ver)}\][\s\S]*?(?=\n## \[|\Z)',
            block,
            md,
            count=1,
        )
        print('md', ver)
    else:
        print('md missing', ver)
CL.write_text(md)
print('done')
