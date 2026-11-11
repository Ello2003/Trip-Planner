from pathlib import Path

p = Path('src/App.tsx')
t = p.read_text()

old = '''  // Promote Research item to Plan
  const handlePromoteToPlan = (item: ResearchItem) => {
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
      { action: 'research-promoted', detail: `Promoted "${item.name}" to Plan on ${currentTrip.name}` }
    );

    // Stay on Research after promote
    setModalType('editPlanItem');
    setModalPayload({ item: newPlan });
    showToast('Added to Plan \u2014 still on Research');
  };'''

# Match whatever em-dash is in the file
import re
m = re.search(
    r"  // Promote Research item to Plan\n  const handlePromoteToPlan = \(item: ResearchItem\) => \{[\s\S]*?showToast\([^)]+\);\n  \};",
    t,
)
if not m:
    raise SystemExit('handlePromoteToPlan block not found')

new = '''  // Promote Research item to Plan (shared builder)
  const buildPlanFromResearch = (item: ResearchItem): PlanItem => ({
    id: uid('plan'),
    sheet: item.sheet,
    name: item.name,
    status: 'idea',
    date: currentTrip!.startDate || null,
    endDate: null,
    time: null,
    dayNumber: currentTrip!.timelineMode === 'days' ? 1 : null,
    dayNumberEnd: null,
    location: item.address || '',
    links: (item.links || []).map(l => ({ ...l, id: uid('link') })),
    cost: item.estCost,
    linkedExpenseId: null,
    actualExpenseId: null,
    notes: item.notes || '',
    visited: false,
    estimateCategory: resolveExpenseCategory(item.sheet, state.categories)
  });

  const applyResearchPromotion = (item: ResearchItem, newPlan: PlanItem) => {
    if (!currentTrip) return;
    const updatedResearch = currentTrip.research.map(r =>
      r.id === item.id ? { ...r, status: 'promoted' as const, linkedPlanItemId: newPlan.id } : r
    );
    handleUpdateTrip(
      {
        ...currentTrip,
        planItems: [...currentTrip.planItems, newPlan],
        research: updatedResearch
      },
      { action: 'research-promoted', detail: `Promoted "${item.name}" to Plan on ${currentTrip.name}` }
    );
  };

  // Full promote: add + open edit modal (stay on Research)
  const handlePromoteToPlan = (item: ResearchItem) => {
    if (!currentTrip) return;
    const newPlan = buildPlanFromResearch(item);
    applyResearchPromotion(item, newPlan);
    setModalType('editPlanItem');
    setModalPayload({ item: newPlan });
    showToast('Added to Plan \u2014 edit details if needed');
  };

  // Quick promote: add with existing info only, no modal
  const handleQuickPromoteToPlan = (item: ResearchItem) => {
    if (!currentTrip) return;
    const newPlan = buildPlanFromResearch(item);
    applyResearchPromotion(item, newPlan);
    showToast(`Quick-added "${item.name}" to Plan`);
  };'''

t = t[: m.start()] + new + t[m.end():]

if 'onQuickPromoteToPlan={handleQuickPromoteToPlan}' not in t:
    t = t.replace(
        'onPromoteToPlan={handlePromoteToPlan}',
        'onPromoteToPlan={handlePromoteToPlan}\n            onQuickPromoteToPlan={handleQuickPromoteToPlan}',
        1,
    )

p.write_text(t)
print('App.tsx patched')
