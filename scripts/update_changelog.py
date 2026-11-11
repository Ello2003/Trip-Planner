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
print('APP_VERSION', NEW_VER)
