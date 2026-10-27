import React, { useState } from 'react';
import { Trip, Category, Expense, PlanItem, ManualEstimate } from '../types';
import {
  fmt,
  numVal,
  parseQty,
  parseMoney,
  lineTotal,
  singleLine,
  extractMapEmbedUrl,
  tripTotal,
  budgetCountedTotal
} from '../utils/helpers';
import { removeBlankActual, resolveExpenseCategory } from '../utils/storage';
import { formatCurrencyAmount } from '../utils/currency';

interface BudgetTabProps {
  trip: Trip;
  categories: Category[];
  onUpdateTrip: (updated: Trip, logAction?: { action: string; detail: string }) => void;
  onOpenAddExpenseModal: () => void;
  onOpenAddEstimateModal: () => void;
  onOpenCurrencyConverter?: () => void;
}

export const BudgetTab: React.FC<BudgetTabProps> = ({
  trip,
  categories,
  onUpdateTrip,
  onOpenAddExpenseModal,
  onOpenAddEstimateModal,
  onOpenCurrencyConverter
}) => {
  const [mapEditMode, setMapEditMode] = useState(false);
  const [mapInputUrl, setMapInputUrl] = useState(trip.mapEmbedUrl || '');

  const spent = tripTotal(trip);
  const budgetSpent = budgetCountedTotal(trip);

  // Filter planned items with estimated cost
  const estimatedItems = trip.planItems
    .filter(i => i.cost != null)
    .sort((a, b) => a.sheet.localeCompare(b.sheet));

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

  // Handlers for Estimated Costs
  const handlePlannedEstimateChange = (
    item: PlanItem,
    field: 'name' | 'category' | 'qty' | 'unit',
    value: any
  ) => {
    const updatedPlan = trip.planItems.map(p => {
      if (p.id !== item.id) return p;
      const copy = { ...p };
      if (field === 'name') copy.name = singleLine(value) || copy.name;
      if (field === 'category') {
        copy.estimateCategory = value;
        // update linked actual expense category if exists
        if (copy.actualExpenseId) {
          const exp = trip.expenses.find(e => e.id === copy.actualExpenseId);
          if (exp) exp.category = value;
        }
      }
      if (field === 'qty') copy.estimateQuantity = parseQty(value);
      if (field === 'unit') copy.cost = parseMoney(value);
      return copy;
    });

    onUpdateTrip({
      ...trip,
      planItems: updatedPlan,
      updatedAt: Date.now()
    });
  };

  const handleResetPlannedEstimate = (item: PlanItem) => {
    const original = item.estimateOriginal || {
      name: item.name,
      sheet: item.sheet,
      category: resolveExpenseCategory(item.sheet, categories),
      quantity: 1,
      cost: item.cost
    };

    const updatedPlan = trip.planItems.map(p => {
      if (p.id !== item.id) return p;
      return {
        ...p,
        name: original.name,
        sheet: original.sheet,
        estimateCategory: original.category,
        estimateQuantity: original.quantity == null ? 1 : original.quantity,
        cost: original.cost
      };
    });

    onUpdateTrip(
      {
        ...trip,
        planItems: updatedPlan,
        updatedAt: Date.now()
      },
      { action: 'estimate-reset', detail: `Reset estimated cost "${item.name}" on ${trip.name}` }
    );
  };

  const handleManualEstimateChange = (
    m: ManualEstimate,
    field: 'desc' | 'category' | 'qty' | 'unit',
    value: any
  ) => {
    const updatedManual = trip.manualEstimates.map(item => {
      if (item.id !== m.id) return item;
      const copy = { ...item };
      if (field === 'desc') copy.description = singleLine(value) || copy.description;
      if (field === 'category') copy.category = value;
      if (field === 'qty') copy.quantity = parseQty(value);
      if (field === 'unit') copy.unitCost = parseMoney(value) || 0;
      return copy;
    });

    onUpdateTrip({
      ...trip,
      manualEstimates: updatedManual,
      updatedAt: Date.now()
    });
  };

  const handleDeleteManualEstimate = (m: ManualEstimate) => {
    removeBlankActual(trip, m);
    const updated = trip.manualEstimates.filter(x => x.id !== m.id);
    onUpdateTrip(
      {
        ...trip,
        manualEstimates: updated,
        updatedAt: Date.now()
      },
      { action: 'estimate-deleted', detail: `Removed estimate "${m.description}" from ${trip.name}` }
    );
  };

  // Handlers for Actual Expenses
  const handleExpenseChange = (
    e: Expense,
    field: 'desc' | 'category' | 'qty' | 'cost' | 'actual',
    value: any
  ) => {
    const updatedExpenses = trip.expenses.map(exp => {
      if (exp.id !== e.id) return exp;
      const copy = { ...exp, mirror: false };
      if (field === 'desc') copy.description = singleLine(value) || copy.description;
      if (field === 'category') copy.category = value;
      if (field === 'qty') copy.quantity = parseQty(value);
      if (field === 'cost') copy.unitCost = parseMoney(value, true);
      if (field === 'actual') {
        if (value === '') {
          copy.unitCost = null;
        } else {
          const actualVal = parseMoney(value) || 0;
          const q = parseQty(copy.quantity);
          if (q > 0) copy.unitCost = actualVal / q;
          else {
            copy.quantity = 1;
            copy.unitCost = actualVal;
          }
        }
      }
      return copy;
    });

    onUpdateTrip({
      ...trip,
      expenses: updatedExpenses,
      updatedAt: Date.now()
    });
  };

  const handleDeleteExpense = (expId: string) => {
    const exp = trip.expenses.find(x => x.id === expId);
    if (!exp) return;
    const updatedExpenses = trip.expenses.filter(x => x.id !== expId);
    onUpdateTrip(
      {
        ...trip,
        expenses: updatedExpenses,
        updatedAt: Date.now()
      },
      { action: 'expense-deleted', detail: `Removed "${exp.description}" (${fmt(exp.quantity * (exp.unitCost || 0))}) from ${trip.name}` }
    );
  };

  const handleSaveMap = () => {
    const url = extractMapEmbedUrl(mapInputUrl);
    onUpdateTrip(
      {
        ...trip,
        mapEmbedUrl: url,
        updatedAt: Date.now()
      },
      { action: 'map-updated', detail: `Updated My Maps embed for ${trip.name}` }
    );
    setMapEditMode(false);
  };

  const handleRemoveMap = () => {
    onUpdateTrip(
      {
        ...trip,
        mapEmbedUrl: '',
        updatedAt: Date.now()
      },
      { action: 'map-removed', detail: `Removed My Maps embed for ${trip.name}` }
    );
    setMapInputUrl('');
    setMapEditMode(false);
  };

  return (
    <div>
      <div className="budget-layout">
        {/* Estimated Costs Card */}
        <div className="chart-card budget-fixed-card">
          <h3>Estimated Costs</h3>
          <div className="table-scroll budget-fixed-scroll">
            <table className="exp-table estimate-table">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Description</th>
                  <th style={{ width: '22%' }}>Category</th>
                  <th style={{ width: '10%' }}>Qty</th>
                  <th style={{ width: '14%' }}>Unit Cost</th>
                  <th style={{ width: '16%' }} className="num">Estimated</th>
                  <th style={{ width: '8%' }}></th>
                </tr>
              </thead>
              <tbody>
                {estimatedItems.length > 0 || trip.manualEstimates.length > 0 ? (
                  <>
                    {estimatedItems.map(i => {
                      const qty = i.estimateQuantity == null ? 1 : i.estimateQuantity;
                      const unit = Number(i.cost) || 0;
                      const currentCat = i.estimateCategory || resolveExpenseCategory(i.sheet, categories);

                      return (
                        <tr key={i.id} className="planned-estimate-row">
                          <td>
                            <input
                              type="text"
                              value={i.name}
                              onChange={e => handlePlannedEstimateChange(i, 'name', e.target.value)}
                            />
                            <span className="estimate-source">from Plan · {i.sheet}</span>
                          </td>
                          <td>
                            <select
                              value={currentCat}
                              onChange={e => handlePlannedEstimateChange(i, 'category', e.target.value)}
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
                              value={numVal(qty)}
                              min="0"
                              step="any"
                              style={{ textAlign: 'right' }}
                              onChange={e => handlePlannedEstimateChange(i, 'qty', e.target.value)}
                            />
                          </td>
                          <td className="num">
                            <input
                              type="number"
                              value={numVal(unit)}
                              min="0"
                              step="any"
                              style={{ textAlign: 'right' }}
                              onChange={e => handlePlannedEstimateChange(i, 'unit', e.target.value)}
                            />
                            {i.currency && i.currency !== (trip.homeCurrency || 'GBP') && i.originalCost != null && (
                              <div style={{ fontSize: '10px', color: 'var(--brass)', fontFamily: 'var(--font-mono)', textAlign: 'right', lineHeight: 1.1, marginTop: '2px' }} title={`Converted from ${i.currency} @ ${i.exchangeRate || '—'}`}>
                                {formatCurrencyAmount(i.originalCost, i.currency)} (@{i.exchangeRate})
                              </div>
                            )}
                          </td>
                          <td className="num">{fmt(lineTotal(qty, unit))}</td>
                          <td>
                            <button
                              className="btn-ghost estimate-reset"
                              onClick={() => handleResetPlannedEstimate(i)}
                              title="Reset this row to its Plan values"
                              aria-label="Reset this row to its Plan values"
                            >
                              ↺
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {trip.manualEstimates.map(m => (
                      <tr key={m.id}>
                        <td>
                          <input
                            type="text"
                            value={m.description}
                            onChange={e => handleManualEstimateChange(m, 'desc', e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            value={m.category}
                            onChange={e => handleManualEstimateChange(m, 'category', e.target.value)}
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
                            value={numVal(m.quantity)}
                            min="0"
                            step="any"
                            style={{ textAlign: 'right' }}
                            onChange={e => handleManualEstimateChange(m, 'qty', e.target.value)}
                          />
                        </td>
                        <td className="num">
                          <input
                            type="number"
                            value={numVal(m.unitCost)}
                            min="0"
                            step="any"
                            style={{ textAlign: 'right' }}
                            onChange={e => handleManualEstimateChange(m, 'unit', e.target.value)}
                          />
                          {m.currency && m.currency !== (trip.homeCurrency || 'GBP') && m.originalCost != null && (
                            <div style={{ fontSize: '10px', color: 'var(--brass)', fontFamily: 'var(--font-mono)', textAlign: 'right', lineHeight: 1.1, marginTop: '2px' }} title={`Converted from ${m.currency} @ ${m.exchangeRate || '—'}`}>
                              {formatCurrencyAmount(m.originalCost, m.currency)} (@{m.exchangeRate})
                            </div>
                          )}
                        </td>
                        <td className="num">{fmt(lineTotal(m.quantity, m.unitCost))}</td>
                        <td>
                          <button
                            className="exp-del"
                            onClick={() => handleDeleteManualEstimate(m)}
                            aria-label="Delete estimate"
                            title="Delete"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </>
                ) : (
                  <tr>
                    <td colSpan={6} className="empty-state">
                      No estimated costs yet.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="exp-foot">
                  <td colSpan={4}>Total Estimated</td>
                  <td className="num">{fmt(totalEstimated)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p style={{ fontSize: '11.5px', color: 'var(--ink-soft)', margin: '10px 0 0' }}>
            Actual spend so far:{' '}
            <strong style={{ color: 'var(--ink)' }}>{fmt(spent)}</strong> —{' '}
            {spent > totalEstimated ? (
              <span style={{ color: 'var(--red)' }}>
                {fmt(spent - totalEstimated)} over estimate
              </span>
            ) : (
              <span style={{ color: 'var(--green)' }}>
                {fmt(totalEstimated - spent)} under estimate
              </span>
            )}
          </p>

          <div className="toolbar" style={{ marginTop: '10px', marginBottom: 0, display: 'flex', gap: '8px' }}>
            <button className="btn-primary" onClick={onOpenAddEstimateModal}>
              + Add Estimate
            </button>
            {onOpenCurrencyConverter && (
              <button
                type="button"
                className="btn-secondary"
                onClick={onOpenCurrencyConverter}
                title="Open Currency Converter"
              >
                💱 Currency Converter
              </button>
            )}
          </div>
        </div>

        {/* Actual Expenses Card */}
        <div className="chart-card budget-fixed-card">
          <h3>Actual Expenses</h3>
          <div className="table-scroll budget-fixed-scroll">
            <table className="exp-table budget-exp-table">
              <thead>
                <tr>
                  <th style={{ width: '24%' }}>Description</th>
                  <th style={{ width: '20%' }}>Category</th>
                  <th style={{ width: '8%' }}>Qty</th>
                  <th style={{ width: '13%' }}>Unit Cost</th>
                  <th style={{ width: '13%' }} className="num">Planned</th>
                  <th style={{ width: '14%' }} className="num">Actual</th>
                  <th style={{ width: '8%' }}></th>
                </tr>
              </thead>
              <tbody>
                {trip.expenses.length > 0 ? (
                  trip.expenses.map(e => {
                    const actual = (Number(e.quantity) || 0) * (Number(e.unitCost) || 0);
                    const linkedPlan = trip.planItems.find(
                      p => p.linkedExpenseId === e.id || p.actualExpenseId === e.id
                    );
                    const linkedManual = !linkedPlan
                      ? (trip.manualEstimates || []).find(m => m.actualExpenseId === e.id)
                      : null;
                    const planned =
                      linkedPlan && linkedPlan.cost != null
                        ? (Number(linkedPlan.estimateQuantity == null ? 1 : linkedPlan.estimateQuantity) || 0) *
                          (Number(linkedPlan.cost) || 0)
                        : linkedManual
                        ? (Number(linkedManual.quantity) || 0) * (Number(linkedManual.unitCost) || 0)
                        : null;
                    const overPlan = planned != null && e.unitCost != null && actual > planned;

                    return (
                      <tr key={e.id}>
                        <td>
                          <input
                            type="text"
                            value={e.description}
                            onChange={ev => handleExpenseChange(e, 'desc', ev.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            value={e.category}
                            onChange={ev => handleExpenseChange(e, 'category', ev.target.value)}
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
                            value={numVal(e.quantity)}
                            min="0"
                            step="any"
                            style={{ textAlign: 'right' }}
                            onChange={ev => handleExpenseChange(e, 'qty', ev.target.value)}
                          />
                        </td>
                        <td className="num">
                          <input
                            type="number"
                            value={numVal(e.unitCost)}
                            placeholder="—"
                            min="0"
                            step="any"
                            style={{ textAlign: 'right' }}
                            onChange={ev => handleExpenseChange(e, 'cost', ev.target.value)}
                          />
                          {e.currency && e.currency !== (trip.homeCurrency || 'GBP') && e.originalCost != null && (
                            <div
                              style={{
                                fontSize: '10px',
                                color: 'var(--rust)',
                                fontFamily: 'var(--font-mono)',
                                marginTop: '2px',
                                textAlign: 'right',
                                whiteSpace: 'nowrap'
                              }}
                              title={`Converted from ${formatCurrencyAmount(e.originalCost, e.currency)} at rate 1 ${e.currency} = ${e.exchangeRate || '?'} ${trip.homeCurrency || 'GBP'}`}
                            >
                              {formatCurrencyAmount(e.originalCost, e.currency)} {e.exchangeRate ? `(@${e.exchangeRate})` : ''}
                            </div>
                          )}
                        </td>
                        <td className="num" style={{ color: 'var(--ink-soft)' }}>
                          {planned != null ? fmt(planned) : '—'}
                        </td>
                        <td className="num">
                          <input
                            type="number"
                            value={e.unitCost == null ? '' : lineTotal(e.quantity, e.unitCost).toFixed(2)}
                            placeholder="—"
                            min="0"
                            step="any"
                            style={{
                              textAlign: 'right',
                              color: overPlan ? 'var(--red)' : undefined,
                              fontWeight: overPlan ? 700 : undefined
                            }}
                            onChange={ev => handleExpenseChange(e, 'actual', ev.target.value)}
                          />
                        </td>
                        <td>
                          <button
                            className="exp-del"
                            onClick={() => handleDeleteExpense(e.id)}
                            aria-label="Delete expense row"
                            title="Delete row"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="empty-state">
                      No expenses yet.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="exp-foot">
                  <td colSpan={5}>Total Expenses</td>
                  <td className="num">{fmt(spent)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="toolbar" style={{ marginTop: '10px', marginBottom: 0, display: 'flex', gap: '8px' }}>
            <button className="btn-primary" onClick={onOpenAddExpenseModal}>
              + Add Expense
            </button>
            {onOpenCurrencyConverter && (
              <button
                type="button"
                className="btn-secondary"
                onClick={onOpenCurrencyConverter}
                title="Open Currency Converter"
              >
                💱 Currency Converter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* My Maps Embed Card */}
      <div className="chart-card" style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>My Maps</h3>
          {trip.mapEmbedUrl && !mapEditMode && (
            <button className="btn-ghost btn-sm" onClick={() => setMapEditMode(true)}>
              Change
            </button>
          )}
        </div>

        {trip.mapEmbedUrl && !mapEditMode ? (
          <div style={{ marginTop: '12px' }}>
            <iframe
              src={trip.mapEmbedUrl}
              width="100%"
              height="480"
              style={{ border: 0, borderRadius: '6px', display: 'block' }}
              loading="lazy"
              title="Trip Map"
            />
          </div>
        ) : (
          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <textarea
                rows={1}
                placeholder="Paste a Google My Maps share/embed link (or the full embed code)"
                style={{ flex: 1 }}
                value={mapInputUrl}
                onChange={e => setMapInputUrl(e.target.value)}
              />
              <button className="btn-primary btn-sm" onClick={handleSaveMap}>
                {trip.mapEmbedUrl ? 'Save' : 'Add Map'}
              </button>
              {mapEditMode && (
                <>
                  <button className="btn-ghost btn-sm" onClick={() => setMapEditMode(false)}>
                    Cancel
                  </button>
                  <button className="btn-ghost btn-sm" onClick={handleRemoveMap}>
                    Remove
                  </button>
                </>
              )}
            </div>
            <p style={{ fontSize: '11px', color: 'var(--ink-soft)', margin: '6px 0 0' }}>
              In Google My Maps: Share → Embed on my site, then paste the link or code here.
            </p>
          </div>
        )}
      </div>

      {/* Notes Card */}
      <div className="chart-card">
        <h3>Notes</h3>
        <textarea
          className="notes-box"
          placeholder="Itinerary notes, daily spending caps, reminders…"
          value={trip.notes || ''}
          onChange={e =>
            onUpdateTrip({
              ...trip,
              notes: e.target.value,
              updatedAt: Date.now()
            })
          }
        />
      </div>
    </div>
  );
};
