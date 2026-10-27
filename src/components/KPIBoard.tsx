import React from 'react';
import { Trip } from '../types';
import { fmt, budgetCountedTotal } from '../utils/helpers';

interface KPIBoardProps {
  trips: Trip[];
}

export const KPIBoard: React.FC<KPIBoardProps> = ({ trips }) => {
  const live = trips.filter(t => t.status !== 'cancelled');
  const totalBudget = live.reduce((s, t) => s + Math.max(0, Number(t.budget) || 0), 0);
  const totalSpent = live.reduce((s, t) => s + budgetCountedTotal(t), 0);
  const variance = totalBudget - totalSpent;
  const upcoming = trips.filter(t => t.status === 'upcoming').length;

  return (
    <div className="kpi-board">
      <div className="kpi-cell">
        <div className="label">Total Budgeted</div>
        <div className="value">{fmt(totalBudget)}</div>
      </div>
      <div className="kpi-cell">
        <div className="label">Total Spent</div>
        <div className="value">{fmt(totalSpent)}</div>
      </div>
      <div className="kpi-cell">
        <div className="label">Variance</div>
        <div className={`value ${variance < 0 ? 'over' : 'under'}`} style={{ color: variance < 0 ? '#e0897c' : '#8fd6c3' }}>
          {variance < 0 ? '-' : ''}{fmt(Math.abs(variance))}
        </div>
      </div>
      <div className="kpi-cell">
        <div className="label">Trips Logged</div>
        <div className="value">{trips.length}</div>
      </div>
      <div className="kpi-cell">
        <div className="label">Upcoming</div>
        <div className="value">{upcoming}</div>
      </div>
    </div>
  );
};
