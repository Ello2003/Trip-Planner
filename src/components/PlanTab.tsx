import React, { useState, useEffect } from 'react';
import { loadTripUi, saveTripUi } from '../utils/uiPrefs';
import { InlineText, InlineColor, rekey } from './InlineEdit';
import { SortableList, SortableRow, DragHandle } from './Sortable';
import { Trip, Sheet, PlanItem, Category } from '../types';
import {
  fmt,
  formatDateKey,
  daysBetweenDateKeys,
  addDaysToDateKey,
  compareTimelineItems,
  sortTimelineItems
} from '../utils/helpers';
import { ensureActualExpense, removeBlankActual } from '../utils/storage';
import { formatCurrencyAmount } from '../utils/currency';

interface PlanTabProps {
  onRenameSheet?: (from: string, to: string) => string | null;
  onRecolorSheet?: (key: string, color: string) => void;
  trip: Trip;
  sheets: Sheet[];
  categories: Category[];
  onUpdateTrip: (updated: Trip, logAction?: { action: string; detail: string }) => void;
  onOpenAddPlanModal: (defaultSheet?: string, prefill?: any) => void;
  onOpenEditPlanModal: (item: PlanItem) => void;
  onMoveToResearch: (item: PlanItem) => void;
  onManageSheets: () => void;
  onExportPDF: () => void;
  onOpenCurrencyConverter?: () => void;
}

const PRIORITY_LABELS: Record<number, string> = { 1: '★', 2: '★★', 3: '★★★', 4: '★★★★', 5: '★★★★★' };

/** Prefer plan item priority; fall back to linked Research row */
const planPriority = (item: { id: string; priority?: number | null }, research: { linkedPlanItemId?: string | null; priority?: number | null }[]): number | null => {
  const raw = item.priority != null ? Number(item.priority) : NaN;
  if (Number.isFinite(raw) && raw >= 1 && raw <= 5) return raw;
  const linked = research.find(r => r.linkedPlanItemId === item.id);
  if (linked?.priority != null) {
    const n = Number(linked.priority);
    if (Number.isFinite(n) && n >= 1 && n <= 5) return n;
  }
  return null;
};

export const PlanTab: React.FC<PlanTabProps> = ({
  onRenameSheet,
  onRecolorSheet,
  trip,
  sheets,
  categories,
  onUpdateTrip,
  onOpenAddPlanModal,
  onOpenEditPlanModal,
  onMoveToResearch,
  onManageSheets,
  onExportPDF,
  onOpenCurrencyConverter
}) => {
  const _prefs = loadTripUi(trip.id);
  const [timelineCollapsed, setTimelineCollapsed] = useState(() => !!_prefs.timelineCollapsed);
  const [collapsedSheets, setCollapsedSheets] = useState<Record<string, boolean>>(() => _prefs.planCollapsedSheets || {});

  useEffect(() => {
    const pref = loadTripUi(trip.id);
    setTimelineCollapsed(!!pref.timelineCollapsed);
    setCollapsedSheets(pref.planCollapsedSheets || {});
  }, [trip.id]);

  const toggleSheet = (key: string) => {
    setCollapsedSheets(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveTripUi(trip.id, { planCollapsedSheets: next });
      return next;
    });
  };

  // Rename a section in place; keep its collapsed/expanded state under the new name
  const handleRenameSheet = (from: string, to: string): string | null => {
    const err = onRenameSheet ? onRenameSheet(from, to) : null;
    if (!err) setCollapsedSheets(prev => rekey(prev, from, to));
    return err;
  };

  const mode = trip.timelineMode || 'days';

  const formatWhen = (item: PlanItem) => {
    if (mode === 'dates') {
      if (!item.date) return '—';
      const d = formatDateKey(item.date, { day: 'numeric', month: 'short' });
      const d2 = item.endDate && item.endDate !== item.date ? ' → ' + formatDateKey(item.endDate, { day: 'numeric', month: 'short' }) : '';
      return d + d2 + (item.time ? ' · ' + item.time : '');
    }
    if (!item.dayNumber) return '—';
    const d2 = item.dayNumberEnd && item.dayNumberEnd !== item.dayNumber ? '–' + item.dayNumberEnd : '';
    return 'Day ' + item.dayNumber + d2 + (item.time ? ' · ' + item.time : '');
  };

  const getSheetColor = (key: string) => {
    const s = sheets.find(sh => sh.key === key);
    return s ? s.color : '#5b6672';
  };

  // Group items for Hour by Hour
  const UNSCHEDULED = '\u0000unscheduled';
  const groups: Record<string, { label: string; items: PlanItem[] }> = {};
  const groupOrder: string[] = [];

  trip.planItems.forEach(item => {
    // Hour-by-hour only includes items with an explicit time (no default clock time)
    const hasTime = item.time != null && String(item.time).trim() !== '';
    if (!hasTime) return;

    let key: string, label: string;
    if (mode === 'dates') {
      let itemDate = item.date || null;
      if (!itemDate && item.dayNumber != null && trip.startDate) {
        itemDate = addDaysToDateKey(trip.startDate, Number(item.dayNumber) - 1);
      }
      key = itemDate || UNSCHEDULED;
      label = itemDate ? formatDateKey(itemDate, { weekday: 'short', day: 'numeric', month: 'short' }) : 'Unscheduled';
    } else {
      let itemDay = item.dayNumber != null ? Number(item.dayNumber) : null;
      if (itemDay == null && item.date && trip.startDate) {
        const diff = daysBetweenDateKeys(item.date, trip.startDate);
        if (Number.isFinite(diff)) itemDay = diff + 1;
      }
      key = itemDay != null && itemDay > 0 ? String(itemDay) : UNSCHEDULED;
      label = itemDay != null && itemDay > 0 ? 'Day ' + itemDay : 'Unscheduled';
    }
    if (!groups[key]) {
      groups[key] = { label, items: [] };
      groupOrder.push(key);
    }
    groups[key].items.push(item);
  });

  groupOrder.sort((a, b) => {
    if (a === UNSCHEDULED) return b === UNSCHEDULED ? 0 : 1;
    if (b === UNSCHEDULED) return -1;
    return mode === 'dates' ? a.localeCompare(b) : Number(a) - Number(b);
  });

  const handleToggleVisited = (item: PlanItem) => {
    const copyTrip = { ...trip };
    const updatedPlan = copyTrip.planItems.map(p => {
      if (p.id !== item.id) return p;
      const willVisit = !p.visited;
      const updated = { ...p, visited: willVisit };
      if (willVisit) {
        ensureActualExpense(copyTrip, updated, categories);
      }
      return updated;
    });

    onUpdateTrip(
      {
        ...copyTrip,
        planItems: updatedPlan,
        updatedAt: Date.now()
      },
      {
        action: item.visited ? 'plan-unmarked-visited' : 'plan-marked-visited',
        detail: `${item.visited ? 'Unmarked' : 'Marked'} "${item.name}" as visited on ${trip.name}`
      }
    );
  };

  const handleDeleteItem = (item: PlanItem) => {
    removeBlankActual(trip, item);
    let updatedExpenses = trip.expenses;
    if (item.linkedExpenseId) {
      updatedExpenses = updatedExpenses.filter(e => e.id !== item.linkedExpenseId);
    }
    const updatedPlan = trip.planItems.filter(p => p.id !== item.id);
    onUpdateTrip(
      {
        ...trip,
        planItems: updatedPlan,
        expenses: updatedExpenses,
        updatedAt: Date.now()
      },
      { action: 'plan-item-deleted', detail: `Removed "${item.name}" from ${trip.name}` }
    );
  };

  const handleTimelineItemChange = (item: PlanItem, field: 'time' | 'name' | 'notes', val: string) => {
    const updatedPlan = trip.planItems.map(p => {
      if (p.id !== item.id) return p;
      return { ...p, [field]: val || null };
    });
    onUpdateTrip({
      ...trip,
      planItems: updatedPlan,
      updatedAt: Date.now()
    });
  };

  const handleReorderTimelineGroup = (groupKey: string, newIds: string[]) => {
    const orderMap = new Map(newIds.map((id, idx) => [id, idx]));
    const updatedPlan = trip.planItems.map(p => {
      if (!orderMap.has(p.id)) return p;
      return { ...p, timelineOrder: orderMap.get(p.id)! };
    });
    onUpdateTrip({
      ...trip,
      planItems: updatedPlan,
      timelineManualOrder: true,
      updatedAt: Date.now()
    });
  };

  return (
    <div>
      <div className="toolbar">
        <button className="btn-primary" onClick={() => onOpenAddPlanModal()}>
          + Add Item
        </button>
        <div className="timeline-toggle">
          <button
            className={`btn-sm ${mode === 'dates' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => onUpdateTrip({ ...trip, timelineMode: 'dates', updatedAt: Date.now() })}
          >
            Dates
          </button>
          <button
            className={`btn-sm ${mode === 'days' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => onUpdateTrip({ ...trip, timelineMode: 'days', updatedAt: Date.now() })}
          >
            Day numbers
          </button>
        </div>
        <button className="btn-ghost" onClick={onManageSheets} style={{ marginLeft: 'auto' }}>
          Manage Categories
        </button>
        {onOpenCurrencyConverter && (
          <button className="btn-ghost" onClick={onOpenCurrencyConverter} title="Open Currency Converter">
            💱 Currency
          </button>
        )}
        <button className="btn-ghost" onClick={onExportPDF}>
          Export PDF
        </button>
      </div>

      {/* Hour by Hour Timeline Card */}
      <div className="chart-card" style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>Hour by Hour</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              className="btn-ghost btn-sm"
              onClick={() =>
                onUpdateTrip({
                  ...trip,
                  timelineManualOrder: !trip.timelineManualOrder,
                  updatedAt: Date.now()
                })
              }
            >
              {trip.timelineManualOrder ? 'Manual order' : 'Arrange manually'}
            </button>
            <button
              className="btn-ghost btn-sm"
              onClick={() => {
                const next = !timelineCollapsed;
                setTimelineCollapsed(next);
                saveTripUi(trip.id, { timelineCollapsed: next });
              }}
            >
              {timelineCollapsed ? 'Show' : 'Hide'}
            </button>
          </div>
        </div>

        {!timelineCollapsed && (
          <div style={{ marginTop: '12px' }}>
            {groupOrder.length === 0 ? (
              <div className="empty-state">Add a time to plan items to place them on the hour-by-hour timeline.</div>
            ) : (
              groupOrder.map(key => {
                const g = groups[key];
                const sortedItems = trip.timelineManualOrder
                  ? g.items.slice().sort((a, b) => {
                      const ao = Number.isFinite(Number(a.timelineOrder)) ? Number(a.timelineOrder) : Number.POSITIVE_INFINITY;
                      const bo = Number.isFinite(Number(b.timelineOrder)) ? Number(b.timelineOrder) : Number.POSITIVE_INFINITY;
                      return ao - bo || compareTimelineItems(a, b);
                    })
                  : sortTimelineItems(g.items);

                return (
                  <div className="day-block" key={key}>
                    <div className="day-label">
                      <span className="day-date-num">{g.label}</span>
                      <span className="rule" />
                    </div>
                    <div className="day-card">
                      <SortableList
                        ids={sortedItems.map(i => i.id)}
                        onReorder={(_from, _to, newIds) => handleReorderTimelineGroup(key, newIds)}
                      >
                      {sortedItems.map(item => (
                        <SortableRow
                          id={item.id}
                          key={item.id}
                          className={`tl-row ${item.status === 'cancelled' ? 'is-cancelled' : ''}`}
                        >
                          <div className="tl-time-cell">
                            <input
                              className="tl-time"
                              type="time"
                              value={item.time || ''}
                              onChange={e => handleTimelineItemChange(item, 'time', e.target.value)}
                            />
                          </div>
                          <div className="tl-main">
                            <div className="tl-sheet-tag">
                              <span className="sheet-dot" style={{ background: getSheetColor(item.sheet) }} />
                              {item.sheet}
                            </div>
                            <input
                              className="tl-name"
                              value={item.name}
                              placeholder="What's happening"
                              onChange={e => handleTimelineItemChange(item, 'name', e.target.value)}
                            />
                            {(() => {
                              const pr = planPriority(item, trip.research || []);
                              return pr ? (
                                <div style={{ color: 'var(--ochre, var(--brass))', fontSize: '13px', letterSpacing: '2px', marginTop: '3px', fontWeight: 600 }} title={`Priority ${pr}/5`}>
                                  {PRIORITY_LABELS[pr]}
                                </div>
                              ) : null;
                            })()}
                            <textarea
                              className="tl-notes"
                              rows={1}
                              placeholder="Notes…"
                              value={item.notes || ''}
                              onChange={e => handleTimelineItemChange(item, 'notes', e.target.value)}
                            />
                          </div>
                          <div className="tl-reorder-cell">
                            <DragHandle />
                            <button
                              className="exp-del"
                              onClick={() => handleDeleteItem(item)}
                              title="Delete"
                            >
                              ✕
                            </button>
                          </div>
                        </SortableRow>
                      ))}
                      </SortableList>

                      <div className="tl-add-row">
                        <button
                          className="btn-ghost btn-sm"
                          onClick={() => {
                            const prefill = key === UNSCHEDULED ? {} : mode === 'dates' ? { date: key } : { dayNumber: Number(key) };
                            onOpenAddPlanModal(undefined, prefill);
                          }}
                        >
                          + Add stop
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Sheet Sections */}
      <div>
        {sheets
          .filter(s => !trip.hiddenSheets.includes(s.key))
          .map(s => {
            const items = trip.planItems.filter(i => i.sheet === s.key);
            const isCollapsed = collapsedSheets[s.key];

            return (
              <div className={`sheet-section ${items.length ? '' : 'is-empty'}`} key={s.key}>
                <div className="sheet-header">
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                    onClick={() => toggleSheet(s.key)}
                  >
                    <span>{isCollapsed ? '▸' : '▾'}</span>
                    {onRecolorSheet ? (
                      <InlineColor color={s.color} onCommit={c => onRecolorSheet(s.key, c)} />
                    ) : (
                      <span className="sheet-dot" style={{ background: s.color }} />
                    )}
                    {onRenameSheet ? (
                      <InlineText value={s.key} onCommit={n => handleRenameSheet(s.key, n)} />
                    ) : (
                      s.key
                    )}{' '}
                    <span style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                      ({items.length})
                    </span>
                  </div>
                  <button className="btn-ghost btn-sm" onClick={() => onOpenAddPlanModal(s.key)}>
                    + Add
                  </button>
                </div>

                {!isCollapsed && (
                  <div>
                    {items.length > 0 ? (
                      <div className="table-scroll">
                        <table className="exp-table plan-table">
                          <thead>
                            <tr>
                              <th style={{ width: '28%' }}>Name</th>
                              <th style={{ width: '12%' }}>Priority</th>
                              <th style={{ width: '12%' }}>Status</th>
                              <th style={{ width: '16%' }}>When</th>
                              <th style={{ width: '12%' }} className="num">Cost</th>
                              <th style={{ width: '20%' }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map(i => (
                              <tr key={i.id} className={i.status === 'cancelled' ? 'is-cancelled row-dismissed' : ''} >
                                <td>
                                  <div>
                                    <strong>{i.name}</strong>
                                  {(() => {
                                    const pr = planPriority(i, trip.research || []);
                                    return pr ? (
                                      <div style={{ color: 'var(--ochre, var(--brass))', fontSize: '13px', letterSpacing: '2px', marginTop: '3px', fontWeight: 600 }} title={`Priority ${pr}/5`}>
                                        {PRIORITY_LABELS[pr]}
                                      </div>
                                    ) : null;
                                  })()}
                                    {i.visited && (
                                      <span
                                        className="status-chip status-completed"
                                        style={{ fontSize: '9px', marginLeft: '6px' }}
                                      >
                                        visited
                                      </span>
                                    )}
                                  </div>
                                  {i.location && (
                                    <div style={{ color: 'var(--ink-soft)', fontSize: '11px' }}>
                                      {i.location}
                                    </div>
                                  )}
                                  {i.links && i.links.length > 0 && (
                                    <div style={{ fontSize: '11px', marginTop: '2px' }}>
                                      {i.links.map((link, idx) => (
                                        <span key={link.id || idx}>
                                          {idx > 0 && ' · '}
                                          <a
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: 'var(--blue)' }}
                                          >
                                            {link.label || 'link'}
                                          </a>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td style={{ whiteSpace: 'nowrap', color: 'var(--ochre, var(--brass))', letterSpacing: '1px', fontWeight: 600, fontSize: '13px' }}>
                                  {(() => { const pr = planPriority(i, trip.research || []); return pr ? PRIORITY_LABELS[pr] : '—'; })()}
                                </td>
                                <td>
                                  <span
                                    className={`status-chip status-${
                                      i.status === 'booked'
                                        ? 'completed'
                                        : i.status === 'cancelled'
                                        ? 'cancelled'
                                        : 'upcoming'
                                    }`}
                                  >
                                    {i.status}
                                  </span>
                                </td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                                  {formatWhen(i)}
                                </td>
                                 <td className="num">
                                  {i.cost != null ? fmt(i.cost) + (i.linkedExpenseId ? ' ✓' : '') : '—'}
                                  {i.currency && i.currency !== (trip.homeCurrency || 'GBP') && i.originalCost != null && (
                                    <div
                                      style={{
                                        fontSize: '10px',
                                        color: 'var(--rust)',
                                        fontFamily: 'var(--font-mono)',
                                        marginTop: '2px',
                                        whiteSpace: 'nowrap'
                                      }}
                                      title={`Converted from ${formatCurrencyAmount(i.originalCost, i.currency)} at rate 1 ${i.currency} = ${i.exchangeRate || '?'} ${trip.homeCurrency || 'GBP'}`}
                                    >
                                      {formatCurrencyAmount(i.originalCost, i.currency)} {i.exchangeRate ? `(@${i.exchangeRate})` : ''}
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <button
                                    className="exp-del"
                                    onClick={() => handleToggleVisited(i)}
                                    title={i.visited ? 'Unmark as visited' : 'Mark as visited'}
                                    style={{ color: i.visited ? 'var(--green)' : undefined }}
                                  >
                                    ✓
                                  </button>
                                  <button
                                    className="exp-del"
                                    onClick={() => onMoveToResearch(i)}
                                    title="Move to Research"
                                  >
                                    ↩
                                  </button>
                                  <button
                                    className="exp-del"
                                    onClick={() => onOpenEditPlanModal(i)}
                                    title="Edit item"
                                  >
                                    ✎
                                  </button>
                                  <button
                                    className="exp-del"
                                    onClick={() => handleDeleteItem(i)}
                                    title="Delete item"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="empty-state">Nothing here yet.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};
