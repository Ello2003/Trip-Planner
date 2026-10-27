import React from 'react';
import { Trip, Category, Sheet, Settings, PlanItem, ResearchItem } from '../types';
import {
  fmt,
  budgetCountedTotal,
  tripDuration,
  countryFlagForTrip,
  daysUntil
} from '../utils/helpers';
import { BudgetTab } from './BudgetTab';
import { TripChartsTab } from './TripChartsTab';
import { PlanTab } from './PlanTab';
import { ResearchTab } from './ResearchTab';
import { VisitedTab } from './VisitedTab';
import { PackingTab } from './PackingTab';
import { AttireTab } from './AttireTab';
import { HaulsTab } from './HaulsTab';
import { TripMap } from './TripMap';
import { ensureActualExpense } from '../utils/storage';

interface TripDetailViewProps {
  trip: Trip;
  categories: Category[];
  sheets: Sheet[];
  settings: Settings;
  activeTripTab: string;
  setActiveTripTab: (tab: string) => void;
  onBackToDashboard: () => void;
  onUpdateTrip: (updated: Trip, logAction?: { action: string; detail: string }) => void;
  onEditTrip: () => void;
  onDuplicateTrip: () => void;
  onDeleteTrip: () => void;
  onOpenReorderTabs: () => void;
  onOpenAddExpenseModal: () => void;
  onOpenAddEstimateModal: () => void;
  onOpenAddPlanModal: (defaultSheet?: string, prefill?: any) => void;
  onOpenEditPlanModal: (item: PlanItem) => void;
  onMoveToResearch: (item: PlanItem) => void;
  onOpenAddResearchModal: (defaultSheet?: string) => void;
  onOpenEditResearchModal: (item: ResearchItem) => void;
  onPromoteToPlan: (item: ResearchItem) => void;
  onOpenAddPackingModal: (defaultCat?: string) => void;
  onManageSheets: () => void;
  onOpenMapSettings: () => void;
  onExportPDF: () => void;
  onShowToast: (msg: string) => void;
  onOpenCurrencyConverter?: () => void;
}

export const TripDetailView: React.FC<TripDetailViewProps> = ({
  trip,
  categories,
  sheets,
  settings,
  activeTripTab,
  setActiveTripTab,
  onBackToDashboard,
  onUpdateTrip,
  onEditTrip,
  onDuplicateTrip,
  onDeleteTrip,
  onOpenReorderTabs,
  onOpenAddExpenseModal,
  onOpenAddEstimateModal,
  onOpenAddPlanModal,
  onOpenEditPlanModal,
  onMoveToResearch,
  onOpenAddResearchModal,
  onOpenEditResearchModal,
  onPromoteToPlan,
  onOpenAddPackingModal,
  onManageSheets,
  onOpenMapSettings,
  onExportPDF,
  onShowToast,
  onOpenCurrencyConverter
}) => {
  const [showMapBanner, setShowMapBanner] = React.useState<boolean>(false);
  const [planViewMode, setPlanViewMode] = React.useState<'both' | 'timeline' | 'map'>('both');

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

  const budgetSpent = budgetCountedTotal(trip);
  const budget = Math.max(0, Number(trip.budget) || 0);
  const diff = budget - budgetSpent;
  const perPerson = trip.travelers > 1 ? budgetSpent / trip.travelers : null;

  const flag = countryFlagForTrip(trip);
  const flagTitle = trip.countryGuessed
    ? 'Guessed from trip name — click Edit Trip to confirm'
    : trip.country;

  let dateSub = `${trip.year} · ${trip.status}`;
  if (trip.startDate) {
    dateSub += ` · ${trip.startDate}${trip.endDate ? ' → ' + trip.endDate : ''}`;
  }
  const detailDays = tripDuration(trip);
  if (detailDays) {
    dateSub += ` · ${detailDays} day${detailDays !== 1 ? 's' : ''}`;
  }
  if (trip.status === 'upcoming' && trip.startDate) {
    const d = daysUntil(trip.startDate);
    dateSub += ` · ${d >= 0 ? 'in ' + d + ' days' : Math.abs(d) + ' days ago'}`;
  }

  const packingCount = trip.packingList.length
    ? ` (${trip.packingList.filter(p => p.packed).length}/${trip.packingList.length})`
    : '';

  const disabledTabsSet = new Set(settings.disabledTabs || ['attire', 'hauls']);
  const visibleTabs = (settings.tripTabOrder || []).filter(k => !disabledTabsSet.has(k));

  React.useEffect(() => {
    if (disabledTabsSet.has(activeTripTab)) {
      setActiveTripTab(visibleTabs[0] || 'budget');
    }
  }, [activeTripTab, settings.disabledTabs]);

  const renderTabButton = (key: string) => {
    let label = 'Tab';
    let count = '';
    if (key === 'budget') label = 'Budget';
    if (key === 'charts') label = 'Charts';
    if (key === 'plan') {
      label = 'Plan';
      if (trip.planItems.length) count = ` (${trip.planItems.length})`;
    }
    if (key === 'packing') {
      label = 'Packing';
      count = packingCount;
    }
    if (key === 'attire') {
      label = 'Attire & Bags';
      const outfitCount = trip.outfits?.length || 0;
      if (outfitCount) count = ` (${outfitCount})`;
    }
    if (key === 'hauls') {
      label = 'Lounges & Hauls';
      const haulsCount = (trip.hauls?.length || 0) + (trip.loungeVisits?.length || 0);
      if (haulsCount) count = ` (${haulsCount})`;
    }
    if (key === 'research') {
      label = 'Research';
      if (trip.research.length) count = ` (${trip.research.length})`;
    }
    if (key === 'posttrip') {
      label = 'Visited';
      const visitedCount = trip.planItems.filter(p => p.visited).length;
      if (visitedCount) count = ` (${visitedCount})`;
    }

    return (
      <button
        key={key}
        className={`tab-btn ${activeTripTab === key ? 'active' : ''}`}
        onClick={() => setActiveTripTab(key)}
      >
        {label}
        {count}
      </button>
    );
  };

  return (
    <main>
      <button className="btn-ghost back-btn" onClick={onBackToDashboard}>
        ← All Trips
      </button>

      <div className="detail-header">
        <div>
          <div className="detail-title">
            {flag && (
              <span
                className={`pass-flag ${trip.countryGuessed ? 'pass-flag-guessed' : ''}`}
                title={flagTitle}
              >
                {flag}{' '}
              </span>
            )}
            {trip.name}
          </div>
          <div className="detail-sub">{dateSub}</div>
        </div>

        <div className="detail-figs">
          <div className="detail-fig">
            <div className="label">Budget</div>
            <div className="value">{fmt(budget)}</div>
          </div>
          <div className="detail-fig">
            <div className="label">Spent</div>
            <div className="value">{fmt(budgetSpent)}</div>
          </div>
          <div className="detail-fig">
            <div className="label">Variance</div>
            <div
              className="value"
              style={{ color: diff < 0 ? '#e0897c' : '#8fd6c3' }}
            >
              {diff < 0 ? '-' : ''}
              {fmt(Math.abs(diff))}
            </div>
          </div>
          {perPerson != null && (
            <div className="detail-fig">
              <div className="label">Per Person ({trip.travelers})</div>
              <div className="value">{fmt(perPerson)}</div>
            </div>
          )}
        </div>
      </div>

      <div className="toolbar">
        <button
          className={`btn-ghost ${showMapBanner ? 'active' : ''}`}
          onClick={() => setShowMapBanner(!showMapBanner)}
          style={{ borderColor: showMapBanner ? 'var(--brass)' : undefined }}
        >
          🗺️ {showMapBanner ? 'Hide Map Banner' : 'Itinerary Map'}
        </button>
        {onOpenCurrencyConverter && (
          <button
            type="button"
            className="btn-ghost"
            onClick={onOpenCurrencyConverter}
            title="Open Currency Converter"
          >
            💱 Currency
          </button>
        )}
        <button className="btn-ghost" onClick={onEditTrip}>
          Edit Trip Details
        </button>
        <button className="btn-ghost" onClick={onDuplicateTrip}>
          Duplicate as New Trip
        </button>
        <button className="btn-danger" onClick={onDeleteTrip}>
          Delete Trip
        </button>
      </div>

      {showMapBanner && (
        <TripMap
          trip={trip}
          sheets={sheets}
          categories={categories}
          settings={settings}
          onOpenMapSettings={onOpenMapSettings}
          onUpdateTrip={onUpdateTrip}
          onToggleVisited={handleToggleVisited}
        />
      )}

      <div className="tab-bar">
        {visibleTabs.map(renderTabButton)}
        <button
          className="btn-ghost btn-sm"
          onClick={onOpenReorderTabs}
          title="Customize & Reorder Tabs"
          style={{
            alignSelf: 'center',
            padding: '5px 10px',
            fontSize: '0.82rem',
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          ⚙️ Tabs
        </button>
      </div>

      {activeTripTab === 'budget' && (
        <BudgetTab
          trip={trip}
          categories={categories}
          onUpdateTrip={onUpdateTrip}
          onOpenAddExpenseModal={onOpenAddExpenseModal}
          onOpenAddEstimateModal={onOpenAddEstimateModal}
          onOpenCurrencyConverter={onOpenCurrencyConverter}
        />
      )}

      {activeTripTab === 'charts' && (
        <TripChartsTab trip={trip} categories={categories} />
      )}

      {activeTripTab === 'plan' && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              padding: '6px 12px',
              background: 'var(--paper-raised)',
              border: '1px solid var(--paper-edge)',
              borderRadius: '6px',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                View:
              </span>
              <div style={{ display: 'inline-flex', gap: '4px' }}>
                <button
                  type="button"
                  className={`btn-ghost btn-sm ${planViewMode === 'both' ? 'active' : ''}`}
                  onClick={() => setPlanViewMode('both')}
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    background: planViewMode === 'both' ? 'var(--brass)' : 'transparent',
                    color: planViewMode === 'both' ? '#fff' : 'inherit'
                  }}
                >
                  🔀 Map & Timeline
                </button>
                <button
                  type="button"
                  className={`btn-ghost btn-sm ${planViewMode === 'timeline' ? 'active' : ''}`}
                  onClick={() => setPlanViewMode('timeline')}
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    background: planViewMode === 'timeline' ? 'var(--brass)' : 'transparent',
                    color: planViewMode === 'timeline' ? '#fff' : 'inherit'
                  }}
                >
                  📋 Timeline Only
                </button>
                <button
                  type="button"
                  className={`btn-ghost btn-sm ${planViewMode === 'map' ? 'active' : ''}`}
                  onClick={() => setPlanViewMode('map')}
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    background: planViewMode === 'map' ? 'var(--brass)' : 'transparent',
                    color: planViewMode === 'map' ? '#fff' : 'inherit'
                  }}
                >
                  🗺️ Map Only
                </button>
              </div>
            </div>

            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={onOpenMapSettings}
              title="Configure Google Maps API Key"
              style={{ fontSize: '11px', padding: '3px 8px', fontFamily: 'var(--font-mono)' }}
            >
              ⚙️ Maps Key
            </button>
          </div>

          {(planViewMode === 'both' || planViewMode === 'map') && !showMapBanner && (
            <TripMap
              trip={trip}
              sheets={sheets}
              categories={categories}
              settings={settings}
              onOpenMapSettings={onOpenMapSettings}
              onUpdateTrip={onUpdateTrip}
              onToggleVisited={handleToggleVisited}
            />
          )}

          {planViewMode !== 'map' && (
            <PlanTab
              trip={trip}
              sheets={sheets}
              categories={categories}
              onUpdateTrip={onUpdateTrip}
              onOpenAddPlanModal={onOpenAddPlanModal}
              onOpenEditPlanModal={onOpenEditPlanModal}
              onMoveToResearch={onMoveToResearch}
              onManageSheets={onManageSheets}
              onExportPDF={onExportPDF}
              onOpenCurrencyConverter={onOpenCurrencyConverter}
            />
          )}
        </div>
      )}


      {activeTripTab === 'attire' && (
        <AttireTab trip={trip} onUpdateTrip={onUpdateTrip} />
      )}

      {activeTripTab === 'hauls' && (
        <HaulsTab trip={trip} onUpdateTrip={onUpdateTrip} />
      )}

      {activeTripTab === 'research' && (
        <ResearchTab
          trip={trip}
          sheets={sheets}
          categories={categories}
          settings={settings}
          onUpdateTrip={onUpdateTrip}
          onOpenAddResearchModal={onOpenAddResearchModal}
          onOpenEditResearchModal={onOpenEditResearchModal}
          onPromoteToPlan={onPromoteToPlan}
          onManageSheets={onManageSheets}
          onOpenMapSettings={onOpenMapSettings}
        />
      )}

      {activeTripTab === 'posttrip' && (
        <VisitedTab
          trip={trip}
          sheets={sheets}
          categories={categories}
          onUpdateTrip={onUpdateTrip}
        />
      )}

      {activeTripTab === 'packing' && (
        <PackingTab
          trip={trip}
          onUpdateTrip={onUpdateTrip}
          onOpenAddPackingModal={onOpenAddPackingModal}
          onShowToast={onShowToast}
        />
      )}
    </main>
  );
};
