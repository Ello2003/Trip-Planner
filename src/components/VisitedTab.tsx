import React from 'react';
import { Trip, Sheet, Category, PlanItem } from '../types';
import {
  fmt,
  numVal,
  parseQty,
  parseMoney,
  lineTotal,
  singleLine
} from '../utils/helpers';
import { ensureActualExpense, resolveExpenseCategory } from '../utils/storage';

interface VisitedTabProps {
  trip: Trip;
  sheets: Sheet[];
  categories: Category[];
  onUpdateTrip: (updated: Trip, logAction?: { action: string; detail: string }) => void;
}

export const VisitedTab: React.FC<VisitedTabProps> = ({
  trip,
  sheets,
  categories,
  onUpdateTrip
}) => {
  const visited = trip.planItems.filter(i => i.visited);

  const handleFieldChange = (
    item: PlanItem,
    field: 'name' | 'location' | 'category' | 'qty' | 'unit',
    value: any
  ) => {
    const copyTrip = { ...trip };
    let expense = item.actualExpenseId ? copyTrip.expenses.find(e => e.id === item.actualExpenseId) : null;
    if (!expense) {
      expense = ensureActualExpense(copyTrip, item, categories, true);
    }

    const updatedPlan = copyTrip.planItems.map(p => {
      if (p.id !== item.id) return p;
      const copy = { ...p };
      if (field === 'name') copy.name = singleLine(value) || copy.name;
      if (field === 'location') copy.location = singleLine(value);
      if (field === 'category') copy.estimateCategory = value;
      return copy;
    });

    if (expense) {
      if (field === 'name') expense.description = singleLine(value) || expense.description;
      if (field === 'category') expense.category = value;
      if (field === 'qty') expense.quantity = parseQty(value);
      if (field === 'unit') expense.unitCost = parseMoney(value, true);
      expense.mirror = false;
    }

    onUpdateTrip({
      ...copyTrip,
      planItems: updatedPlan,
      updatedAt: Date.now()
    });
  };

  const handleUnmarkVisited = (item: PlanItem) => {
    const updatedPlan = trip.planItems.map(p => {
      if (p.id !== item.id) return p;
      return { ...p, visited: false };
    });

    onUpdateTrip(
      {
        ...trip,
        planItems: updatedPlan,
        updatedAt: Date.now()
      },
      { action: 'plan-unmarked-visited', detail: `Removed "${item.name}" from Visited on ${trip.name}` }
    );
  };

  return (
    <div>
      <div className="toolbar">
        <p style={{ fontSize: '12px', color: 'var(--ink-soft)', margin: 0 }}>
          Visited items are the bridge from Plan to Actual Expenses. Planned values stay visible for comparison; edit the actual fields here and the same actual expense is updated in Budget.
        </p>
      </div>

      {visited.length === 0 ? (
        <div className="empty-state">
          Nothing marked as visited yet. In the Plan tab, click the ✓ button on an item to add it here.
        </div>
      ) : (
        sheets.map(s => {
          const items = visited.filter(i => i.sheet === s.key);
          if (!items.length) return null;

          return (
            <div className="sheet-section" key={s.key}>
              <div className="sheet-header">
                <div>
                  <span className="sheet-dot" style={{ background: s.color }} />
                  {s.key}{' '}
                  <span style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                    ({items.length})
                  </span>
                </div>
              </div>

              <div className="table-scroll">
                <table className="exp-table plan-table visited-table">
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>Description</th>
                      <th style={{ width: '18%' }}>Category</th>
                      <th style={{ width: '8%' }}>Qty</th>
                      <th style={{ width: '13%' }}>Unit Cost</th>
                      <th style={{ width: '12%' }} className="num">Planned</th>
                      <th style={{ width: '12%' }} className="num">Actual</th>
                      <th style={{ width: '7%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(i => {
                      const expense = i.actualExpenseId ? trip.expenses.find(e => e.id === i.actualExpenseId) : null;
                      const planned =
                        i.cost != null
                          ? (Number(i.estimateQuantity == null ? 1 : i.estimateQuantity) || 0) * (Number(i.cost) || 0)
                          : null;
                      const actualQty = expense ? expense.quantity : i.estimateQuantity == null ? 1 : i.estimateQuantity;
                      const actualUnit = expense ? (expense.unitCost == null ? '' : expense.unitCost) : (i.cost == null ? '' : i.cost);
                      const actualCat = expense
                        ? expense.category
                        : i.estimateCategory || resolveExpenseCategory(i.sheet, categories);
                      const actual =
                        expense && expense.unitCost != null
                          ? (Number(expense.quantity) || 0) * (Number(expense.unitCost) || 0)
                          : null;

                      return (
                        <tr key={i.id}>
                          <td>
                            <input
                              type="text"
                              value={i.name}
                              onChange={e => handleFieldChange(i, 'name', e.target.value)}
                            />
                            <input
                              type="text"
                              placeholder="Location"
                              value={i.location || ''}
                              style={{
                                marginTop: '3px',
                                width: '100%',
                                fontSize: '11px',
                                color: 'var(--ink-soft)'
                              }}
                              onChange={e => handleFieldChange(i, 'location', e.target.value)}
                            />
                          </td>
                          <td>
                            <select
                              value={actualCat}
                              onChange={e => handleFieldChange(i, 'category', e.target.value)}
                            >
                              {categories.map(c => (
                                <option key={c.name} value={c.name}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="num">
                            <input
                              type="number"
                              value={numVal(actualQty)}
                              min="0"
                              step="any"
                              style={{ textAlign: 'right' }}
                              onChange={e => handleFieldChange(i, 'qty', e.target.value)}
                            />
                          </td>
                          <td className="num">
                            <input
                              type="number"
                              value={numVal(actualUnit)}
                              placeholder="—"
                              min="0"
                              step="any"
                              style={{ textAlign: 'right' }}
                              onChange={e => handleFieldChange(i, 'unit', e.target.value)}
                            />
                          </td>
                          <td className="num" style={{ color: 'var(--ink-soft)' }}>
                            {planned != null ? fmt(planned) : '—'}
                          </td>
                          <td className="num">
                            {actual != null ? fmt(actual) : (actualUnit !== '' ? fmt(lineTotal(actualQty, actualUnit)) : '—')}
                          </td>
                          <td>
                            <button
                              className="exp-del"
                              onClick={() => handleUnmarkVisited(i)}
                              title="Remove from Visited"
                              aria-label="Remove from Visited"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
