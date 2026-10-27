import React from 'react';
import { Trip, Sheet } from '../types';
import { fmt, tripDuration, countryFlagForTrip, formatDateKey } from '../utils/helpers';

interface PrintAreaProps {
  trip: Trip | null;
  sheets: Sheet[];
}

export const PrintArea: React.FC<PrintAreaProps> = ({ trip, sheets }) => {
  if (!trip) return null;

  const days = tripDuration(trip);
  let subLine = `${trip.year} · ${trip.status}`;
  if (trip.startDate) {
    subLine += ` · ${trip.startDate}${trip.endDate ? ' → ' + trip.endDate : ''}`;
  }
  if (days) subLine += ` · ${days} day${days !== 1 ? 's' : ''}`;
  if (trip.country) subLine += ` · ${trip.country}`;

  const flag = countryFlagForTrip(trip);

  const formatWhen = (item: any) => {
    if (trip.timelineMode === 'dates') {
      if (!item.date) return '—';
      const d = formatDateKey(item.date, { day: 'numeric', month: 'short' });
      const d2 = item.endDate && item.endDate !== item.date ? ' → ' + formatDateKey(item.endDate, { day: 'numeric', month: 'short' }) : '';
      return d + d2 + (item.time ? ' · ' + item.time : '');
    }
    if (!item.dayNumber) return '—';
    const d2 = item.dayNumberEnd && item.dayNumberEnd !== item.dayNumber ? '–' + item.dayNumberEnd : '';
    return 'Day ' + item.dayNumber + d2 + (item.time ? ' · ' + item.time : '');
  };

  return (
    <div id="printArea">
      <div className="p-hdr">
        <h1>
          {flag && `${flag} `}
          {trip.name}
        </h1>
        <div className="p-sub">{subLine}</div>
      </div>

      {sheets.map(s => {
        const items = trip.planItems
          .filter(i => i.sheet === s.key)
          .sort((a, b) => {
            const av = a.date || (a.dayNumber != null ? String(a.dayNumber).padStart(4, '0') : '') || '';
            const bv = b.date || (b.dayNumber != null ? String(b.dayNumber).padStart(4, '0') : '') || '';
            return av.localeCompare(bv);
          });

        if (!items.length) return null;

        return (
          <div className="p-section" key={s.key}>
            <h2>{s.key}</h2>
            {items.map(i => {
              const when = formatWhen(i);
              return (
                <div className="p-item" key={i.id}>
                  <div className="p-item-top">
                    <span className="p-item-name">{i.name}</span>
                    <span className="p-item-meta">
                      {i.status}
                      {when && when !== '—' ? ' · ' + when : ''}
                      {i.cost != null ? ' · ' + fmt(i.cost) : ''}
                    </span>
                  </div>
                  {i.location && (
                    <div className="p-item-line">
                      <b>Address:</b> {i.location}
                    </div>
                  )}
                  {i.links && i.links.length > 0 && (
                    <div className="p-item-line">
                      <b>Links:</b>{' '}
                      {i.links.map(l => (l.label ? `${l.label}: ${l.url}` : l.url)).join(' · ')}
                    </div>
                  )}
                  {i.notes && (
                    <div className="p-item-line">
                      <b>Notes:</b> {i.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
