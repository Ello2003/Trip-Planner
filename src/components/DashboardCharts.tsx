import React from 'react';
import { Trip, Category, CUR } from '../types';
import { fmt, budgetCountedTotal, tripCategoryTotals, tripDuration } from '../utils/helpers';

interface DashboardChartsProps {
  trips: Trip[];
  categories: Category[];
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ trips, categories }) => {
  // 1. Spend by Category
  const totals: Record<string, number> = {};
  categories.forEach(c => (totals[c.name] = 0));
  trips.filter(t => t.status !== 'cancelled').forEach(t => {
    const ct = tripCategoryTotals(t, categories);
    categories.forEach(c => (totals[c.name] += ct[c.name] || 0));
  });
  const maxCat = Math.max(1, ...Object.values(totals));
  const activeCategoryNames = categories
    .map(c => c.name)
    .filter(n => totals[n] > 0)
    .sort((a, b) => totals[b] - totals[a]);

  // 2. Year over Year
  const years: Record<string, { budget: number; spent: number; count: number }> = {};
  trips.forEach(t => {
    if (t.status === 'cancelled') return;
    if (!years[t.year]) years[t.year] = { budget: 0, spent: 0, count: 0 };
    years[t.year].budget += Number(t.budget || 0);
    years[t.year].spent += budgetCountedTotal(t);
    years[t.year].count += 1;
  });
  const yearKeys = Object.keys(years).sort();
  const maxYear = Math.max(1, ...yearKeys.map(y => Math.max(years[y].budget, years[y].spent)));

  // 3. Trend SVG
  const sortedTrips = [...trips].sort((a, b) => a.year - b.year || a.name.localeCompare(b.name));
  const w = 900, h = 200, padL = 46, padB = 34, padT = 10, padR = 10;
  const chartW = w - padL - padR, chartH = h - padT - padB;
  const maxVal = Math.max(1, ...sortedTrips.map(t => Math.max(Number(t.budget || 0), budgetCountedTotal(t))));
  const bw = sortedTrips.length ? chartW / sortedTrips.length : 0;

  // 4. Trip Daily Spend
  const comparable = trips
    .filter(t => t.status !== 'cancelled' && tripDuration(t))
    .map(t => {
      const days = tripDuration(t) || 1;
      return { trip: t, days, perDay: budgetCountedTotal(t) / days };
    })
    .sort((a, b) => b.perDay - a.perDay);
  const topDaily = comparable.slice(0, 10);
  const maxDaily = Math.max(1, ...topDaily.map(r => r.perDay));

  return (
    <div>
      <div className="charts-row">
        <div className="chart-card">
          <h3>Spend by Category — All Trips</h3>
          {activeCategoryNames.length ? (
            activeCategoryNames.map(name => {
              const catObj = categories.find(c => c.name === name);
              const color = catObj ? catObj.color : '#5b6672';
              const pct = (totals[name] / maxCat) * 100;
              return (
                <div className="cat-bar-row" key={name}>
                  <div className="cat-bar-label">{name}</div>
                  <div className="cat-bar-track">
                    <div className="cat-bar-fill" style={{ width: `${pct.toFixed(1)}%`, background: color }} />
                  </div>
                  <div className="cat-bar-val">{fmt(totals[name])}</div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">No expenses logged yet.</div>
          )}
        </div>

        <div className="chart-card">
          <h3>Year over Year</h3>
          {yearKeys.length ? (
            yearKeys.map(y => {
              const row = years[y];
              const pct = Math.min(100, (row.spent / maxYear) * 100);
              const over = row.spent > row.budget;
              return (
                <div className="year-row" key={y}>
                  <div className="year-label">{y}</div>
                  <div className="year-track">
                    <div
                      className="year-fill"
                      style={{
                        width: `${pct}%`,
                        background: over ? 'var(--red)' : 'var(--green)'
                      }}
                    />
                  </div>
                  <div className="year-val">
                    {fmt(row.spent)} / {fmt(row.budget)}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">No trips yet.</div>
          )}
        </div>
      </div>

      <div className="charts-row" style={{ gridTemplateColumns: '1fr' }}>
        <div className="chart-card">
          <h3>Budget vs. Actual by Trip</h3>
          {sortedTrips.length ? (
            <svg viewBox={`0 0 ${w} ${h}`} className="trend-svg">
              {[0, 1, 2, 3, 4].map(i => {
                const y = padT + chartH - (chartH * i) / 4;
                return (
                  <g key={i}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={w - padR}
                      y2={y}
                      stroke="#c7bb98"
                      strokeWidth="1"
                      strokeDasharray="2,3"
                    />
                    <text
                      x={padL - 6}
                      y={y + 3}
                      fontFamily="ui-monospace, Menlo, Consolas, monospace"
                      fontSize="9"
                      fill="#37455a"
                      textAnchor="end"
                    >
                      {CUR}
                      {Math.round((maxVal * i) / 4)}
                    </text>
                  </g>
                );
              })}

              {sortedTrips.map((t, i) => {
                const spent = budgetCountedTotal(t);
                const budget = Number(t.budget || 0);
                const groupX = padL + i * bw;
                const bH1 = (budget / maxVal) * chartH;
                const bH2 = (spent / maxVal) * chartH;
                const bwEach = Math.min(24, bw * 0.32);
                const x1 = groupX + bw / 2 - bwEach - 2;
                const x2 = groupX + bw / 2 + 2;
                const shortTitle = t.name.length > 9 ? t.name.slice(0, 8) + '…' : t.name;

                return (
                  <g key={t.id}>
                    <rect
                      x={x1}
                      y={padT + chartH - bH1}
                      width={bwEach}
                      height={bH1}
                      fill="#b8874f"
                    />
                    <rect
                      x={x2}
                      y={padT + chartH - bH2}
                      width={bwEach}
                      height={bH2}
                      fill="#1c2530"
                      opacity={spent > budget ? 0.85 : 1}
                    />
                    <text
                      x={groupX + bw / 2}
                      y={h - 10}
                      fontFamily="ui-monospace, Menlo, Consolas, monospace"
                      fontSize="9"
                      fill="#37455a"
                      textAnchor="middle"
                    >
                      {shortTitle}
                    </text>
                  </g>
                );
              })}
            </svg>
          ) : (
            <div className="empty-state">No trips logged yet.</div>
          )}
          <div className="trend-legend">
            <span>
              <span className="swatch" style={{ background: 'var(--brass)' }} />
              Budget
            </span>
            <span>
              <span className="swatch" style={{ background: 'var(--ink)' }} />
              Spent
            </span>
          </div>
        </div>
      </div>

      <div className="charts-row" style={{ gridTemplateColumns: '1fr' }}>
        <div className="chart-card">
          <h3>Average Spend per Day by Trip</h3>
          {topDaily.length ? (
            topDaily.map(row => {
              const pct = (row.perDay / maxDaily) * 100;
              return (
                <div className="trip-chart-row" key={row.trip.id}>
                  <div className="trip-daily-label" title={row.trip.name}>
                    {row.trip.name}
                  </div>
                  <div className="trip-chart-track">
                    <div className="trip-chart-fill" style={{ width: `${pct.toFixed(1)}%`, background: 'var(--blue)' }} />
                  </div>
                  <div className="trip-chart-value">{fmt(row.perDay)} / day</div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">Add trip dates or day numbers to compare daily spending.</div>
          )}
        </div>
      </div>
    </div>
  );
};
