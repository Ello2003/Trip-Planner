from pathlib import Path

NEW_VER = '1.24.0'
NEW_ENTRY = (
    "Improved mobile usability with a bottom tab bar and responsive Plan timeline so titles are no longer clipped on small screens. "
    "Replaced up/down reorder controls with drag-and-drop across Plan, Research and Packing lists. "
    "Added single-click inline editing for section titles. "
    "Research now offers a quick-add (+) that promotes a place to Plan without opening the form, and an ↩ Plan button that opens the edit form while staying on Research. "
    "Star priority from Research is copied onto Plan items and shown under the name in the Plan table and timeline. "
    "Moved Plan items back to Research keep their priority."
)

p = Path('src/types.ts')
t = p.read_text()
if f"'{NEW_VER}'" in t:
    print('already has 1.24.0')
else:
    needle = "export const CHANGELOG: Record<string, string> = {\n"
    if needle not in t:
        raise SystemExit('CHANGELOG header missing')
    t = t.replace(
        needle,
        needle + f"  '{NEW_VER}': '{NEW_ENTRY}',\n",
        1,
    )
    p.write_text(t)
    print('inserted')
# ensure APP_VERSION
if "APP_VERSION = '1.24.0'" not in t and "APP_VERSION = '1.24.0'" not in p.read_text():
    import re
    t = p.read_text()
    t = re.sub(r"export const APP_VERSION = '[^']+';", "export const APP_VERSION = '1.24.0';", t, count=1)
    p.write_text(t)
    print('APP_VERSION set')
print('ok')
