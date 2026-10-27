import React from 'react';
import { Trip, Category } from '../types';
import { fmt, tripTotal, budgetCountedTotal, expenseAmount } from '../utils/helpers';
import { resolveExpenseCategory } from '../utils/storage';

interface TripChartsTabProps {
  trip: Trip;
  categories: Category[];
}

export const TripChartsTab: React.FC<TripChartsTabProps> = ({ trip, categories }) => {
  const spent = tripTotal(trip);
  const budgetSpent = budgetCountedTotal(trip);
  const budget = Math.max(0, Number(trip.budget) || 0);

  const getCatColor = (name: string) => {
    const c = categories.find(cat => cat.name === name);
    return c ? c.color : '#5b6672';
  };

  // Category totals
  const catTotals: Record<string, number> = {};
  categories.forEach(c => (catTotals[c.name] = 0));
  trip.expenses.forEach(e => {
    catTotals[e.category] = (catTotals[e.category] || 0) + (Number(e.quantity) || 0) * (Number(e.unitCost) || 0);
  });
  const activeCats = categories.map(c => c.name).filter(c => catTotals[c] > 0);

  // Conic gradient stops
  let cumPct = 0;
  const stops: string[] = [];
  activeCats.forEach(c => {
    const pct = spent > 0 ? (catTotals[c] / spent) * 100 : 0;
    stops.push(`${getCatColor(c)} ${cumPct.toFixed(2)}% ${(cumPct + pct).toFixed(2)}%`);
    cumPct += pct;
  });
  const donutBg = stops.length ? `conic-gradient(${stops.join(',')})` : 'var(--paper-edge)';

  // Estimates
  const estimatedItems = trip.planItems.filter(i => i.cost != null);
  const totalEstimated =
    estimatedItems.reduce(
      (s, i) =>
        s +
        (Number(i.estimateQuantity == null ? 1 : i.estimateQuantity) || 0) *
          (Number(i.cost) || 0),
      0
    ) +
    trip.manualEstimates.reduce(
      (s, m) => s + (Number(m.quantity) || 0) * (Number(m.unitCost) || 0),
      0
    );

  const estimateByCategory: Record<string, number> = {};
  estimatedItems.forEach(item => {
    const category = item.estimateCategory || resolveExpenseCategory(item.sheet, categories);
    estimateByCategory[category] =
      (estimateByCategory[category] || 0) +
      (Number(item.estimateQuantity == null ? 1 : item.estimateQuantity) || 0) *
        (Number(item.cost) || 0);
  });
  trip.manualEstimates.forEach(item => {
    const category = item.category || 'Other';
    estimateByCategory[category] =
      (estimateByCategory[category] || 0) +
      (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
  });

  const comparisonCats = Array.from(new Set([...activeCats, ...Object.keys(estimateByCategory)])).sort(
    (a, b) => (catTotals[b] || 0) + (estimateByCategory[b] || 0) - ((catTotals[a] || 0) + (estimateByCategory[a] || 0))
  );
  const comparisonMax = Math.max(1, ...comparisonCats.flatMap(cat => [catTotals[cat] || 0, estimateByCategory[cat] || 0]));

  const budgetMax = Math.max(1, budget, totalEstimated, budgetSpent);
  const budgetChartRows = [
    { label: 'Budget', value: budget, color: 'var(--brass)' },
    { label: 'Estimated', value: totalEstimated, color: 'var(--blue)' },
    { label: 'Actual', value: budgetSpent, color: budgetSpent > budget ? 'var(--red)' : 'var(--green)' }
  ];

  const expenseMax = Math.max(1, ...trip.expenses.map(expenseAmount));
  const largestExpenses = [...trip.expenses].sort((a, b) => expenseAmount(b) - expenseAmount(a)).slice(0, 5);

  const pendingPlanItems = trip.planItems.filter(item => !item.visited);
  const unestimatedItems = pendingPlanItems.filter(item => item.cost == null);
  const unscheduledItems = pendingPlanItems.filter(item =>
    trip.timelineMode === 'dates' ? !item.date : !item.dayNumber
  );
  const gapRows = [
    { label: 'Need cost estimates', items: unestimatedItems },
    { label: trip.timelineMode === 'dates' ? 'Need dates' : 'Need day assignments', items: unscheduledItems }
  ].filter(row => row.items.length);

  return (
    <div>
      <div className="charts-row">
        <div className="chart-card">
          <h3>Category Breakdown</h3>
          {activeCats.length ? (
            <div className="donut-wrap">
              <div className="donut" style={{ background: donutBg }}>
                <div className="donut-center">
                  <div className="amt">{fmt(spent)}</div>
                  <div className="lbl">spent</div>
                </div>
              </div>
              <div className="donut-legend">
                {activeCats.map(c => (
                  <div key={c}>
                    <span className="swatch" style={{ background: getCatColor(c) }} />
                    {c} — {fmt(catTotals[c])}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">No expenses logged yet.</div>
          )}
        </div>

        <div className="chart-card">
          <h3>Budget, Estimate &amp; Actual</h3>
          <div>
            {budgetChartRows.map(row => (
              <div className="trip-chart-row" key={row.label}>
                <div className="trip-chart-label">{row.label}</div>
                <div className="trip-chart-track">
                  <div
                    className="trip-chart-fill"
                    style={{ width: `${((row.value / budgetMax) * 100).toFixed(1)}%`, background: row.color }}
                  />
                </div>
                <div className="trip-chart-value">{fmt(row.value)}</div>
              </div>
            ))}
          </div>
          {budget > 0 ? (
            <div className="trip-chart-note">
              {budgetSpent > budget
                ? `Over budget by ${fmt(budgetSpent - budget)}`
                : `${((budgetSpent / budget) * 100).toFixed(0)}% of budget spent`}
            </div>
          ) : (
            <div className="trip-chart-note">Set a budget to track spending against it.</div>
          )}
        </div>
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <h3>Estimated vs Actual by Category</h3>
          {comparisonCats.length ? (
            <div>
              {comparisonCats.map(cat => (
                <div className="trip-category-chart" key={cat}>
                  <div className="trip-category-title">{cat}</div>
                  <div className="trip-chart-row">
                    <div className="trip-chart-label">Est.</div>
                    <div className="trip-chart-track">
                      <div
                        className="trip-chart-fill"
                        style={{
                          width: `${(((estimateByCategory[cat] || 0) / comparisonMax) * 100).toFixed(1)}%`,
                          background: 'var(--blue)'
                        }}
                      />
                    </div>
                    <div className="trip-chart-value">{fmt(estimateByCategory[cat] || 0)}</div>
                  </div>
                  <div className="trip-chart-row">
                    <div className="trip-chart-label">Actual</div>
                    <div className="trip-chart-track">
                      <div
                        className="trip-chart-fill"
                        style={{
                          width: `${(((catTotals[cat] || 0) / comparisonMax) * 100).toFixed(1)}%`,
                          background: 'var(--green)'
                        }}
                      />
                    </div>
                    <div className="trip-chart-value">{fmt(catTotals[cat] || 0)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">Add estimates or expenses to compare categories.</div>
          )}
        </div>

        <div className="chart-card">
          <h3>Largest Expenses</h3>
          {largestExpenses.length ? (
            <div>
              {largestExpenses.map(expense => (
                <div className="trip-chart-row" key={expense.id}>
                  <div className="trip-expense-label" title={expense.description}>
                    {expense.description || 'Expense'}
                  </div>
                  <div className="trip-chart-track">
                    <div
                      className="trip-chart-fill"
                      style={{
                        width: `${((expenseAmount(expense) / expenseMax) * 100).toFixed(1)}%`,
                        background: 'var(--ochre)'
                      }}
                    />
                  </div>
                  <div className="trip-chart-value">{fmt(expenseAmount(expense))}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No expenses logged yet.</div>
          )}
        </div>

        <div className="chart-card">
          <h3>Planning Gaps</h3>
          {gapRows.length ? (
            gapRows.map(row => (
              <div className="planning-gap" key={row.label}>
                <div className="planning-gap-heading">
                  {row.label}
                  <strong>{row.items.length}</strong>
                </div>
                <div className="planning-gap-examples">
                  {row.items.slice(0, 4).map(item => item.name || 'Untitled item').join(' · ')}
                  {row.items.length > 4 ? ` and ${row.items.length - 4} more` : ''}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">No missing estimates or schedule details found.</div>
          )}
        </div>
      </div>
    </div>
  );
};
