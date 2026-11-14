from pathlib import Path

p = Path('src/components/PlanTab.tsx')
text = p.read_text()
old = '''  trip.planItems.forEach(item => {
    let key: string, label: string;
    if (mode === 'dates') {'''
new = '''  trip.planItems.forEach(item => {
    // Hour-by-hour only includes items with an explicit time (no default clock time)
    const hasTime = item.time != null && String(item.time).trim() !== '';
    if (!hasTime) return;

    let key: string, label: string;
    if (mode === 'dates') {'''
if 'hasTime' in text and 'if (!hasTime) return' in text:
    print('already filtered')
elif old in text:
    text = text.replace(old, new, 1)
    print('filtered')
else:
    raise SystemExit('grouping block not found')

text2 = text.replace(
    'Add items with a date/day to build the hour-by-hour view.',
    'Add a time to plan items to place them on the hour-by-hour timeline.',
    1,
)
if text2 != text:
    print('empty copy')
    text = text2

p.write_text(text)
print('done')
