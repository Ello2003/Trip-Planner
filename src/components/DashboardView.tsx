import React, { useState } from 'react';
import { Trip, Category, Sheet, Settings } from '../types';
import {
  fmt,
  budgetCountedTotal,
  daysUntil,
  shortDate,
  tripDuration,
  countryFlagForTrip,
  dateKeyToLocalDate,
  addDaysToDateKey
} from '../utils/helpers';
import { DashboardCharts } from './DashboardCharts';
import { MobileShellNav } from './MobileShellNav';

interface DashboardViewProps {
  trips: Trip[];
  categories: Category[];
  sheets: Sheet[];
  settings: Settings;
  activeDashTab: 'trips' | 'charts';
  setActiveDashTab: (tab: 'trips' | 'charts') => void;
  onOpenTrip: (tripId: string, initialTab?: string) => void;
  onNewTrip: () => void;
  onManageCategories: () => void;
  onUpdateTrip?: (updated: Trip, logAction?: { action: string; detail: string }) => void;
  onOpenSettings?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  trips,
  categories,
  sheets,
  settings,
  activeDashTab,
  setActiveDashTab,
  onOpenTrip,
  onNewTrip,
  onManageCategories,
  onUpdateTrip,
  onOpenSettings
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('year-desc');
  const [showArchived, setShowArchived] = useState<boolean>(settings.defaultShowArchived ?? false);

  const archivedCount = trips.filter(t => t.status === 'archived' || !!t.isArchived).length;

  let filtered = trips.filter(t => {
    const isArchived = t.status === 'archived' || !!t.isArchived;
    if (statusFilter === 'archived') {
      if (!isArchived) return false;
    } else if (statusFilter !== 'all') {
      if (t.status !== statusFilter) return false;
    } else {
      if (!showArchived && isArchived) return false;
    }
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  switch (sortBy) {
    case 'year-asc':
      filtered.sort((a, b) => a.year - b.year);
      break;
    case 'name':
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'budget-desc':
      filtered.sort((a, b) => Number(b.budget) - Number(a.budget));
      break;
    case 'spend-desc':
      filtered.sort((a, b) => budgetCountedTotal(b) - budgetCountedTotal(a));
      break;
    default:
      filtered.sort((a, b) => b.year - a.year || (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  const now = new Date();
  const upcomingPlanItems: { trip: Trip; item: any; date: Date }[] = [];
  if (settings.showUpNextStrip !== false) {
    trips.forEach(t => {
      if (t.status === 'cancelled' || t.status === 'archived' || t.isArchived) return;
      t.planItems.forEach(item => {
        if (item.status === 'cancelled') return;
        let d: Date | null = null;
        if (t.timelineMode === 'dates') {
          if (item.date) d = dateKeyToLocalDate(item.date, item.time);
        } else if (item.dayNumber && t.startDate) {
          d = dateKeyToLocalDate(addDaysToDateKey(t.startDate, Number(item.dayNumber) - 1), item.time);
        }
        if (d && d >= now) {
          upcomingPlanItems.push({ trip: t, item, date: d });
        }
      });
    });
    upcomingPlanItems.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
  const upNextList = upcomingPlanItems.slice(0, 5);

  const getSheetColor = (key: string) => {
    const s = sheets.find(sh => sh.key === key);
    return s ? s.color : '#5b6672';
  };

  const getStatusLabel = (t: Trip) => {
    if (t.status === 'archived' || t.isArchived) {
      return { cls: 'status-archived', text: '📦 Archived' };
    }
    const spent = budgetCountedTotal(t);
    if (t.status === 'cancelled') return { cls: 'status-cancelled', text: 'Cancelled' };
    if (spent > Number(t.budget || 0)) return { cls: 'status-over', text: 'Over Budget' };
    if (t.status === 'upcoming') return { cls: 'status-upcoming', text: 'Upcoming' };
    return { cls: 'status-completed', text: 'On Track' };
  };

  return (
    <main>
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeDashTab === 'trips' ? 'active' : ''}`}
          onClick={() => setActiveDashTab('trips')}
        >
          Trips
        </button>
        <button
          className={`tab-btn ${activeDashTab === 'charts' ? 'active' : ''}`}
          onClick={() => setActiveDashTab('charts')}
        >
          Charts
        </button>
      </div>

      {activeDashTab === 'trips' ? (
        <div>
          {upNextList.length > 0 && (
            <div className="chart-card upnext-card">
              <h3>Up Next</h3>
              {upNextList.map(({ trip, item, date }) => {
                const diffDays = Math.round((date.getTime() - Date.now()) / 86400000);
                const when = diffDays <= 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : `In ${diffDays} days`;
                const dateLabel =
                  date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
                  (item.time ? ' · ' + item.time : '');
                return (
                  <div
                    className="upnext-row"
                    key={`${trip.id}-${item.id}`}
                    onClick={() => onOpenTrip(trip.id, 'plan')}
                  >
                    <span className="upnext-dot" style={{ background: getSheetColor(item.sheet) }} />
                    <div className="upnext-main">
                      <div className="upnext-name">{item.name}</div>
                      <div className="upnext-sub">
                        {item.sheet} · {trip.name} · {dateLabel}
                      </div>
                    </div>
                    <div className="countdown-chip">{when}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button className="btn-primary" onClick={onNewTrip}>
                + New Trip
              </button>
              <button className="btn-ghost" onClick={onManageCategories}>
                Categories
              </button>
              {onOpenSettings && (
                <button type="button" className="btn-ghost" onClick={onOpenSettings} title="Feature Customisation & Global Settings">
                  ⚙️ Settings
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className={`btn-ghost ${showArchived ? 'active' : ''}`}
                onClick={() => setShowArchived(prev => !prev)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderColor: showArchived ? 'var(--brass)' : undefined,
                  background: showArchived ? 'var(--paper-raised)' : undefined,
                  fontWeight: showArchived ? 600 : 400
                }}
                title={showArchived ? 'Hide archived trips from view' : 'Show archived trips on dashboard'}
              >
                <span>📦 {showArchived ? 'Hide Archived' : 'Show Archived'}</span>
                {archivedCount > 0 && (
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', padding: '1px 6px', borderRadius: '10px', background: showArchived ? 'var(--brass)' : 'var(--paper-edge)', color: showArchived ? '#fff' : 'inherit' }}>
                    {archivedCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="filter-bar">
            <input type="text" placeholder="Search trips…" value={search} onChange={e => setSearch(e.target.value)} />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All active statuses</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="archived">📦 Archived ({archivedCount})</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="year-desc">Newest first</option>
              <option value="year-asc">Oldest first</option>
              <option value="name">Name A–Z</option>
              <option value="budget-desc">Budget: high–low</option>
              <option value="spend-desc">Spend: high–low</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              {trips.length === 0 ? 'No trips yet — add your first one above.' : 'No trips match that search/filter.'}
            </div>
          ) : (
            <div className="trips-grid">
              {filtered.map(t => {
                const spent = budgetCountedTotal(t);
                const budget = Number(t.budget || 0);
                const diff = budget - spent;
                const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
                const st = getStatusLabel(t);
                const fillColor = spent > budget ? 'var(--red)' : 'var(--green)';
                const perPerson = t.travelers > 1 ? spent / t.travelers : null;
                let countdown: string | null = null;
                if (t.status === 'upcoming' && t.startDate) {
                  const d = daysUntil(t.startDate);
                  countdown = d >= 0 ? `In ${d}d` : `${Math.abs(d)}d ago`;
                }
                const days = tripDuration(t);
                let datesLine = '';
                if (t.startDate) {
                  datesLine = shortDate(t.startDate) + (t.endDate && t.endDate !== t.startDate ? ' → ' + shortDate(t.endDate) : '');
                  if (days) datesLine += ` · ${days} day${days !== 1 ? 's' : ''}`;
                } else if (days) {
                  datesLine = `${days} day${days !== 1 ? 's' : ''}`;
                }
                const flag = countryFlagForTrip(t);
                const flagTitle = t.countryGuessed ? 'Guessed from trip name — click Edit Trip to confirm' : t.country;
                const isArchived = t.status === 'archived' || !!t.isArchived;
                return (
                  <div
                    className={`pass ${isArchived ? 'pass-archived' : ''}`}
                    key={t.id}
                    onClick={() => onOpenTrip(t.id)}
                    style={{ opacity: isArchived ? 0.88 : 1, border: isArchived ? '1px dashed var(--brass)' : undefined }}
                  >
                    <div className="pass-top">
                      <div className="pass-eyebrow">
                        <span>Boarding Pass</span>
                        <span className="chip-group" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span className={`status-chip ${st.cls}`}>{st.text}</span>
                          {countdown && settings.showCountdownBadge !== false && (
                            <span className="countdown-chip">{countdown}</span>
                          )}
                          {onUpdateTrip && (
                            isArchived ? (
                              <button type="button" className="btn-ghost btn-sm" style={{ fontSize: '10px', padding: '1px 7px', background: 'var(--paper-raised)' }} onClick={(e) => { e.stopPropagation(); onUpdateTrip({ ...t, status: 'upcoming', isArchived: false, updatedAt: Date.now() }, { action: 'trip-unarchived', detail: `Restored "${t.name}" from archive` }); }} title="Unarchive and restore to active dashboard">Restore</button>
                            ) : (
                              <button type="button" className="btn-ghost btn-sm" style={{ fontSize: '10px', padding: '1px 6px', opacity: 0.75 }} onClick={(e) => { e.stopPropagation(); onUpdateTrip({ ...t, status: 'archived', isArchived: true, updatedAt: Date.now() }, { action: 'trip-archived', detail: `Archived trip "${t.name}"` }); }} title="Archive trip to hide from dashboard">📦 Archive</button>
                            )
                          )}
                        </span>
                      </div>
                      <div className="pass-name">
                        {flag && (<span className={`pass-flag ${t.countryGuessed ? 'pass-flag-guessed' : ''}`} title={flagTitle}>{flag}{' '}</span>)}
                        {t.name}
                      </div>
                      {datesLine && <div className="pass-dates">{datesLine}</div>}
                      <div className="pass-figures">
                        <span>Budget {fmt(budget)}</span>
                        <span className={diff < 0 ? 'diff-neg' : 'diff-pos'}>{diff < 0 ? '-' : ''}{fmt(Math.abs(diff))}</span>
                      </div>
                      {perPerson != null && (<div className="pass-pp">{fmt(perPerson)} / person ({t.travelers})</div>)}
                      <div className="pass-track">
                        <div className="pass-fill" style={{ width: `${pct}%`, background: fillColor }} />
                      </div>
                    </div>
                    <div className="perforation" />
                    <div className="pass-bottom">
                      <div className="barcode" />
                      <div className="pass-year">{t.year}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <DashboardCharts trips={trips} categories={categories} />
      )}

      <MobileShellNav
        active={activeDashTab === 'charts' ? 'charts' : 'trips'}
        onTrips={() => setActiveDashTab('trips')}
        onCharts={() => setActiveDashTab('charts')}
        onNewTrip={onNewTrip}
        onSettings={() => onOpenSettings && onOpenSettings()}
      />
    </main>
  );
};
