import React, { useState } from 'react';
import { Trip, Category, Sheet } from '../types';
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

interface DashboardViewProps {
  trips: Trip[];
  categories: Category[];
  sheets: Sheet[];
  activeDashTab: 'trips' | 'charts';
  setActiveDashTab: (tab: 'trips' | 'charts') => void;
  onOpenTrip: (tripId: string, initialTab?: string) => void;
  onNewTrip: () => void;
  onManageCategories: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  trips,
  categories,
  sheets,
  activeDashTab,
  setActiveDashTab,
  onOpenTrip,
  onNewTrip,
  onManageCategories
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('year-desc');

  // Filter & sort
  let filtered = trips.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
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

  // Calculate upcoming plan items for "Up Next" strip
  const now = new Date();
  const upcomingPlanItems: { trip: Trip; item: any; date: Date }[] = [];
  trips.forEach(t => {
    if (t.status === 'cancelled') return;
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
  const upNextList = upcomingPlanItems.slice(0, 5);

  const getSheetColor = (key: string) => {
    const s = sheets.find(sh => sh.key === key);
    return s ? s.color : '#5b6672';
  };

  const getStatusLabel = (t: Trip) => {
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

          <div className="toolbar">
            <button className="btn-primary" onClick={onNewTrip}>
              + New Trip
            </button>
            <button className="btn-ghost" onClick={onManageCategories}>
              Categories
            </button>
          </div>

          <div className="filter-bar">
            <input
              type="text"
              placeholder="Search trips…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
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
              {trips.length === 0
                ? 'No trips yet — add your first one above.'
                : 'No trips match that search/filter.'}
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
                const flagTitle = t.countryGuessed
                  ? 'Guessed from trip name — click Edit Trip to confirm'
                  : t.country;

                return (
                  <div className="pass" key={t.id} onClick={() => onOpenTrip(t.id)}>
                    <div className="pass-top">
                      <div className="pass-eyebrow">
                        <span>Boarding Pass</span>
                        <span className="chip-group">
                          <span className={`status-chip ${st.cls}`}>{st.text}</span>
                          {countdown && <span className="countdown-chip">{countdown}</span>}
                        </span>
                      </div>

                      <div className="pass-name">
                        {flag && (
                          <span
                            className={`pass-flag ${t.countryGuessed ? 'pass-flag-guessed' : ''}`}
                            title={flagTitle}
                          >
                            {flag}{' '}
                          </span>
                        )}
                        {t.name}
                      </div>

                      {datesLine && <div className="pass-dates">{datesLine}</div>}

                      {/* Travel Manifest Badges */}
                      {((t.outfits && t.outfits.length > 0) || (t.hauls && t.hauls.length > 0) || (t.luggageBags && t.luggageBags.length > 0)) && (
                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                          {t.luggageBags && t.luggageBags.length > 0 && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#eae4d3] border border-[#d5cbac] rounded text-[#1c2530] font-medium">
                              💼 {t.luggageBags.length} bag{t.luggageBags.length !== 1 ? 's' : ''}
                            </span>
                          )}
                          {t.outfits && t.outfits.length > 0 && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#eae4d3] border border-[#d5cbac] rounded text-[#1c2530] font-medium">
                              👔 {t.outfits.length} look{t.outfits.length !== 1 ? 's' : ''}
                            </span>
                          )}
                          {((t.hauls?.length || 0) + (t.loungeVisits?.length || 0)) > 0 && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#eae4d3] border border-[#d5cbac] rounded text-[#1c2530] font-medium">
                              ✨ {(t.hauls?.length || 0) + (t.loungeVisits?.length || 0)} hauls/lounges
                            </span>
                          )}
                        </div>
                      )}

                      <div className="pass-figures">
                        <span>Budget {fmt(budget)}</span>
                        <span className={diff < 0 ? 'diff-neg' : 'diff-pos'}>
                          {diff < 0 ? '-' : ''}{fmt(Math.abs(diff))}
                        </span>
                      </div>

                      {perPerson != null && (
                        <div className="pass-pp">
                          {fmt(perPerson)} / person ({t.travelers})
                        </div>
                      )}

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
    </main>
  );
};
