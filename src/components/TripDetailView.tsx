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

  // TEMP RESTORE MARKER - full body continues in next commit if truncated
  return (
    <main>
      <button className="btn-ghost back-btn" onClick={onBackToDashboard}>
        ← All Trips
      </button>
      <div className="tab-bar">
        {visibleTabs.map(key => (
          <button
            key={key}
            className={`tab-btn ${activeTripTab === key ? 'active' : ''}`}
            onClick={() => setActiveTripTab(key)}
          >
            {key}
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
      {activeTripTab === 'charts' && (
        <TripChartsTab trip={trip} categories={categories} />
      )}
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
      {activeTripTab === 'attire' && (
        <AttireTab trip={trip} onUpdateTrip={onUpdateTrip} />
      )}
      {activeTripTab === 'hauls' && (
        <HaulsTab trip={trip} onUpdateTrip={onUpdateTrip} />
      )}
      <MobileBottomTabs
        tabs={visibleTabs}
        active={activeTripTab}
        onChange={setActiveTripTab}
      />
    </main>
  );
};
