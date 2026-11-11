from pathlib import Path
import re

NEW_VER = '1.24.0'
NEW_ENTRY = (
    "Improved mobile usability with a bottom tab bar and responsive Plan timeline so titles are no longer clipped on small screens. "
    "Replaced up/down reorder controls with drag-and-drop across Plan, Research and Packing lists. "
    "Added single-click inline editing for section titles. "
    "Research now offers a quick-add (+) that promotes a place to Plan without opening the form, and an ↩ Plan button that opens the edit form while staying on Research. "
    "Star priority from Research is copied onto Plan items and shown under the name in the Plan table and timeline. "
    "Moved Plan items back to Research keep their priority."
)

# --- types.ts ---
t = Path('src/types.ts').read_text()
t2, n = re.subn(r"export const APP_VERSION = '[^']+';", f"export const APP_VERSION = '{NEW_VER}';", t, count=1)
if n != 1:
    raise SystemExit('APP_VERSION not found')
t = t2

if f"'{NEW_VER}'" not in t:
    t = t.replace(
        'export const CHANGELOG: Record<string, string> = {\n',
        "export const CHANGELOG: Record<string, string> = {\n"
        f"  '{NEW_VER}': '{NEW_ENTRY}',\n",
        1,
    )
    print('CHANGELOG entry added')
else:
    print('CHANGELOG entry already present')
Path('src/types.ts').write_text(t)

# --- package.json ---
pkg = Path('package.json').read_text()
pkg2, n = re.subn(r'"version": "[^"]+"', f'"version": "{NEW_VER}"', pkg, count=1)
if n:
    Path('package.json').write_text(pkg2)
    print('package.json version', NEW_VER)

# --- CHANGELOG.md ---
md_path = Path('CHANGELOG.md')
md = md_path.read_text() if md_path.exists() else '# Changelog\n\n'
header = f'''## [{NEW_VER}] - 2026-11-11

### Added
- **Mobile bottom tab navigation** for an app-like trip experience without changing desktop layout.
- **Drag-and-drop reordering** (Plan timeline, Research tables, Packing) via @dnd-kit, replacing up/down buttons.
- **Single-click inline title editing** for sheet/section names.
- **Quick promote from Research**: `+` adds to Plan with existing data and no modal; stays on Research.
- **↩ Plan** control on Research (same arrow icon as Plan’s Move to Research) opens the full Plan edit form.
- **Star priority on Plan items**: Research priority (★–★★★★★) is copied on promote and shown under the name in the Plan table and timeline; retained when moving back to Research.

### Fixed
- Plan timeline titles no longer clip on narrow mobile widths.
- Promoting to Plan no longer switches away from the Research tab.
- Research rows again show links and notes under name/address.

---

'''
if f'[{NEW_VER}]' not in md:
    # insert after the intro block (after first ---)
    if '---\n\n' in md:
        parts = md.split('---\n\n', 1)
        md = parts[0] + '---\n\n' + header + parts[1]
    else:
        md = md + '\n' + header
    md_path.write_text(md)
    print('CHANGELOG.md updated')
else:
    print('CHANGELOG.md already has version')
print('done')
