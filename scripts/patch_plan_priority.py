from pathlib import Path

# App.tsx — copy priority on promote and move-to-research
app = Path('src/App.tsx').read_text()

def inject_priority_in_new_plan(src: str) -> str:
    # After visited: false in PlanItem object literals created from research
    old = "visited: false,\n      estimateCategory: resolveExpenseCategory(item.sheet, state.categories)"
    new = "visited: false,\n      priority: item.priority ?? null,\n      estimateCategory: resolveExpenseCategory(item.sheet, state.categories)"
    if old in src:
        return src.replace(old, new)  # both promote handlers share this shape
    return src

app2 = inject_priority_in_new_plan(app)
if app2 == app:
    print('WARN: promote shape not found')
else:
    print('promote priority injected', app.count('visited: false,\n      estimateCategory: resolveExpenseCategory'), '->', app2.count('priority: item.priority'))
    app = app2

# Move to research: use plan priority
old_m = "priceLevel: null,\n      priority: null,\n      estCost: item.cost,"
new_m = "priceLevel: null,\n      priority: item.priority ?? null,\n      estCost: item.cost,"
if old_m in app:
    app = app.replace(old_m, new_m, 1)
    print('move-to-research priority')
else:
    print('WARN move shape')

Path('src/App.tsx').write_text(app)
print('App ok')
