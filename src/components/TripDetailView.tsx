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
import { NotesTab } from './NotesTab';
import { PackingTab } from './PackingTab';
import { AttireTab } from './AttireTab';
import { HaulsTab } from './HaulsTab';
import { TripMap } from './TripMap';
import { MobileBottomTabs } from './MobileBottomTabs';
import { ensureActualExpense } from '../utils/storage';

interface TripDetailViewProps {
  trip: Trip;
  categories: Category[];
  sheets: Sheet[];
  onRenameSheet?: (from: string, to: string) => string | null;
  onRecolorSheet?: (key: string, color: string) => void;
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
  onQuickPromoteToPlan?: (item: ResearchItem) => void;
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
  onRenameSheet,
  onRecolorSheet,
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
  onQuickPromoteToPlan,
  onOpenAddPackingModal,
  onManageSheets,
  onOpenMapSettings,
  onExportPDF,
  onShowToast,
  onOpenCurrencyConverter
}) => {
  const [planViewMode, setPlanViewMode] = React.useState<'both' | 'timeline' | 'map'>('both');

  const handleToggleVisited = (item: PlanItem) => {
    const updatedPlan = trip.planItems.map(p => {
      if (p.id !== item.id) return p;
      return { ...p, visited: !p.visited };
    });
    const next = { ...trip, planItems: updatedPlan, updatedAt: Date.now() };
    const withExpense = ensureActualExpense(next, item.id, categories);
    onUpdateTrip(
      withExpense,
      {
        action: item.visited ? 'plan-unmarked-visited' : 'plan-marked-visited',
        detail: `${item.visited ? 'Unmarked' : 'Marked'} "${item.name}" as visited`
      }
    );
  };

  const spent = budgetCountedTotal(trip.expenses || []);
  const remaining = (trip.budget || 0) - spent;
  const duration = tripDuration(trip.startDate, trip.endDate);
  const flag = countryFlagForTrip(trip);
  const daysLeft = daysUntil(trip.startDate);

  const tabOrder = settings.tripTabOrder || ['plan', 'budget', 'charts', 'research', 'notes', 'posttrip', 'packing', 'attire', 'hauls'];
  const visibleTabs = tabOrder.filter(t => !(settings.hiddenTripTabs || []).includes(t));

  return (
    <main className="trip-detail">
      <div className="trip-detail-header">
        <button className="btn-ghost btn-sm" onClick={onBackToDashboard}>
          \u2190 Trips
        </button>
        <div className="trip-detail-title">
          <span className="trip-flag">{flag}</span>
          <div>
            <h1>{trip.name}</h1>
            <div className="trip-detail-meta">
              {trip.startDate && (
                <span>
                  {trip.startDate}
                  {trip.endDate ? ` \u2013 ${trip.endDate}` : ''}
                  {duration ? ` \u00b7 ${duration}d` : ''}
                </span>
              )}
              {typeof daysLeft === 'number' && daysLeft >= 0 && (
                <span> \u00b7 {daysLeft === 0 ? 'Today' : `${daysLeft}d away`}</span>
              )}
              <span>
                {' '}\u00b7 Budget {fmt(trip.budget || 0)} \u00b7 Spent {fmt(spent)}
                {remaining >= 0 ? ` \u00b7 Left ${fmt(remaining)}` : ` \u00b7 Over ${fmt(-remaining)}`}
              </span>
            </div>
          </div>
        </div>
        <div className="trip-detail-actions">
          <button className="btn-ghost btn-sm" onClick={onEditTrip}>
            Edit
          </button>
          <button className="btn-ghost btn-sm" onClick={onDuplicateTrip}>
            Duplicate
          </button>
          <button className="btn-ghost btn-sm" onClick={onOpenReorderTabs}>
            Tabs
          </button>
          <button className="btn-ghost btn-sm" onClick={onExportPDF}>
            Export
          </button>
          <button className="btn-ghost btn-sm danger" onClick={onDeleteTrip}>
            Delete
          </button>
        </div>
      </div>

      <div className="trip-tabs desktop-only">
        {visibleTabs.map(tab => (
          <button
            key={tab}
            className={`trip-tab ${activeTripTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTripTab(tab)}
          >
            {tab === 'plan'
              ? 'Plan'
              : tab === 'budget'
              ? 'Budget'
              : tab === 'charts'
              ? 'Charts'
              : tab === 'research'
              ? 'Research'
              : tab === 'notes'
              ? 'Notes'
              : tab === 'posttrip'
              ? 'Visited'
              : tab === 'packing'
              ? 'Packing'
              : tab === 'attire'
              ? 'Attire'
              : tab === 'hauls'
              ? 'Hauls'
              : tab}
          </button>
        ))}
      </div>

      {activeTripTab === 'plan' && (
        <PlanTab
          trip={trip}
          sheets={sheets}
          categories={categories}
          onRenameSheet={onRenameSheet}
          onRecolorSheet={onRecolorSheet}
          onUpdateTrip={onUpdateTrip}
          onOpenAddPlanModal={onOpenAddPlanModal}
          onOpenEditPlanModal={onOpenEditPlanModal}
          onMoveToResearch={onMoveToResearch}
          onManageSheets={onManageSheets}
          onExportPDF={onExportPDF}
          onOpenCurrencyConverter={onOpenCurrencyConverter}
        />
      )}
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
      {activeTripTab === 'charts' && <TripChartsTab trip={trip} categories={categories} />}
      {activeTripTab === 'research' && (
        <ResearchTab
          trip={trip}
          sheets={sheets}
          categories={categories}
          settings={settings}
          onRenameSheet={onRenameSheet}
          onRecolorSheet={onRecolorSheet}
          onUpdateTrip={onUpdateTrip}
          onOpenAddResearchModal={onOpenAddResearchModal}
          onOpenEditResearchModal={onOpenEditResearchModal}
          onPromoteToPlan={onPromoteToPlan}
          onQuickPromoteToPlan={onQuickPromoteToPlan}
          onManageSheets={onManageSheets}
          onOpenMapSettings={onOpenMapSettings}
        />
      )}
      {activeTripTab === 'notes' && (
        <NotesTab key={trip.id} trip={trip} onUpdateTrip={onUpdateTrip} onShowToast={onShowToast} />
      )}
      {activeTripTab === 'posttrip' && (
        <VisitedTab
          trip={trip}
          sheets={sheets}
          categories={categories}
          onRenameSheet={onRenameSheet}
          onRecolorSheet={onRecolorSheet}
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
      {activeTripTab === 'attire' && <AttireTab trip={trip} onUpdateTrip={onUpdateTrip} />}
      {activeTripTab === 'hauls' && <HaulsTab trip={trip} onUpdateTrip={onUpdateTrip} />}
      <MobileBottomTabs tabs={visibleTabs} active={activeTripTab} onChange={setActiveTripTab} />
    </main>
  );
};
