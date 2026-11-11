from pathlib import Path

p = Path('src/types.ts')
t = p.read_text()
NEW = "  '1.24.0': 'Improved mobile usability with a bottom tab bar and responsive Plan timeline so titles are no longer clipped on small screens. Replaced up/down reorder controls with drag-and-drop across Plan, Research and Packing lists. Added single-click inline editing for section titles. Research now offers a quick-add (+) that promotes a place to Plan without opening the form, and a Plan button that opens the edit form while staying on Research. Star priority from Research is copied onto Plan items and shown under the name in the Plan table and timeline. Moved Plan items back to Research keep their priority.',\n"
if "'1.24.0':" in t:
    print('present')
else:
    marker = "export const CHANGELOG: Record<string, string> = {\n"
    if marker not in t:
        raise SystemExit('no changelog marker')
    t = t.replace(marker, marker + NEW, 1)
    p.write_text(t)
    print('wrote entry')
if "APP_VERSION = '1.24.0'" not in p.read_text():
    import re
    t = p.read_text()
    t = re.sub(r"export const APP_VERSION = '[^']+';", "export const APP_VERSION = '1.24.0';", t, count=1)
    p.write_text(t)
    print('version fixed')
print('final check', "'1.24.0':" in p.read_text())
