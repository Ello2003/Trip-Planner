from pathlib import Path
import re
from datetime import date

NEW = '1.25.0'
NOTES = (
    'Document uploads on Budget and Notes per trip. '
    'Research category sections can be drag-reordered. '
    'Plan timeline sorts By time or Manual (choice is saved). '
    'Hour-by-hour timeline only includes items with a set time. '
    'Inline star priority on Plan items. '
    'Dismissed/cancelled rows show full strikethrough. '
    'Collapsed sections and view toggles persist across navigation. '
    'Tab bar only shows known enabled tabs; Notes tab wired; mobile bottom tabs match.'
)

# types
t = Path('src/types.ts').read_text()
t = re.sub(r"export const APP_VERSION = '[^']+';", f"export const APP_VERSION = '{NEW}';", t, count=1)
if f"'{NEW}':" not in t:
    t = t.replace(
        'export const CHANGELOG: Record<string, string> = {\n',
        f"export const CHANGELOG: Record<string, string> = {{\n  '{NEW}': '{NOTES}',\n",
        1,
    )
Path('src/types.ts').write_text(t)

# package
pkg = Path('package.json').read_text()
pkg = re.sub(r'"version": "[^"]+"', f'"version": "{NEW}"', pkg, count=1)
Path('package.json').write_text(pkg)

# changelog md
md_path = Path('CHANGELOG.md')
md = md_path.read_text() if md_path.exists() else '# Changelog\n\n---\n\n'
block = f'''## [{NEW}] - {date.today().isoformat()}

### Added
- **Document uploads** on Budget and Notes (PDF, images, office files; stored with the trip).
- **Drag-and-drop** for Research category sections.
- **By time / Manual** timeline sort control on Plan (persisted).
- **Inline star ratings** on Plan items when Research has no priority.
- **Persistent UI state**: collapsed sections, research/plan views, open trip and tab.

### Changed
- Hour-by-hour timeline only lists items that have a **time** set (no default clock time).
- Tab bar filters unknown/disabled tabs; Notes tab fully wired; mobile bottom nav matches desktop visibility.

### Fixed
- Timeline sort was forced to Manual on every load.
- Orphan / duplicate tab keys from older saves.

---

'''
if f'[{NEW}]' not in md:
    if '---\n\n' in md:
        a, b = md.split('---\n\n', 1)
        md = a + '---\n\n' + block + b
    else:
        md = md + '\n' + block
    md_path.write_text(md)
print('bumped', NEW)
