from pathlib import Path
p = Path('src/App.tsx')
t = p.read_text()
old = """    setActiveTripTab('plan');
    setModalType('editPlanItem');
    setModalPayload({ item: newPlan });
    showToast('Promoted — set a date/day to place it on the timeline');"""
new = """    // Stay on Research after promote
    setModalType('editPlanItem');
    setModalPayload({ item: newPlan });
    showToast('Added to Plan — still on Research');"""
if old not in t:
    raise SystemExit('pattern not found')
p.write_text(t.replace(old, new, 1))
print('patched')
