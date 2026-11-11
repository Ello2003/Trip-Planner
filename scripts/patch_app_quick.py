from pathlib import Path
app = Path("src/App.tsx").read_text()
if "handleQuickPromoteToPlan" not in app:
    i = app.find("showToast('Added to Plan")
    if i < 0:
        i = app.find("showToast('Promoted")
    if i < 0:
        raise SystemExit("toast not found")
    j = app.find("};", i)
    insert_after = j + 2
    quick_fn = """

  // Quick promote: add with existing info only, no modal
  const handleQuickPromoteToPlan = (item: ResearchItem) => {
    if (!currentTrip) return;
    const newPlan: PlanItem = {
      id: uid('plan'),
      sheet: item.sheet,
      name: item.name,
      status: 'idea',
      date: currentTrip.startDate || null,
      endDate: null,
      time: null,
      dayNumber: currentTrip.timelineMode === 'days' ? 1 : null,
      dayNumberEnd: null,
      location: item.address || '',
      links: (item.links || []).map(l => ({ ...l, id: uid('link') })),
      cost: item.estCost,
      linkedExpenseId: null,
      actualExpenseId: null,
      notes: item.notes || '',
      visited: false,
      estimateCategory: resolveExpenseCategory(item.sheet, state.categories)
    };
    const updatedResearch = currentTrip.research.map(r =>
      r.id === item.id ? { ...r, status: 'promoted' as const, linkedPlanItemId: newPlan.id } : r
    );
    handleUpdateTrip(
      {
        ...currentTrip,
        planItems: [...currentTrip.planItems, newPlan],
        research: updatedResearch
      },
      { action: 'research-promoted', detail: `Quick-added "${item.name}" to Plan on ${currentTrip.name}` }
    );
    showToast(`Quick-added "${item.name}" to Plan`);
  };"""
    app = app[:insert_after] + quick_fn + app[insert_after:]
    print("inserted handler")
else:
    print("handler exists")
if "onQuickPromoteToPlan={handleQuickPromoteToPlan}" not in app:
    app = app.replace(
        "onPromoteToPlan={handlePromoteToPlan}",
        "onPromoteToPlan={handlePromoteToPlan}\n            onQuickPromoteToPlan={handleQuickPromoteToPlan}",
        1,
    )
    print("wired")
Path("src/App.tsx").write_text(app)
print("app ok")
