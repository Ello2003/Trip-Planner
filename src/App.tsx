import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AppState,
  Trip,
  Category,
  Sheet,
  Settings,
  PlanItem,
  ResearchItem,
  HistoryEntry,
  APP_VERSION
} from './types';
import {
  loadInitialState,
  saveStateToLocalStorage,
  snapshotHistory,
  loadHistory,
  defaultSeedState,
  resolveExpenseCategory
} from './utils/storage';
import { uid, singleLine, fmt } from './utils/helpers';
import {
  githubConfigured,
  githubPushRemote,
  githubFetchRemote
} from './utils/githubSync';
import { Header } from './components/Header';
import { KPIBoard } from './components/KPIBoard';
import { DashboardView } from './components/DashboardView';
import { TripDetailView } from './components/TripDetailView';
import { Footer } from './components/Footer';
import { PrintArea } from './components/PrintArea';
import { useFirebase } from './context/FirebaseContext';
import { VersionHistoryModal } from './components/VersionHistoryModal';
import {
  TripModal,
  ExpenseModal,
  AddEstimateModal,
  PlanItemModal,
  ResearchItemModal,
  PackingItemModal,
  CategoriesModal,
  ManageSheetsModal,
  ReorderTabsModal,
  TrashModal,
  ActivityLogModal,
  BackupHistoryModal,
  GithubSyncModal,
  MapSettingsModal
} from './components/Modals';
import { CurrencyConverterModal } from './components/CurrencyConverterModal';
import { BackupManagerModal } from './components/BackupManagerModal';

const MAX_UNDO = 40;

export const App: React.FC = () => {
  const {
    user,
    syncStatus: cloudSyncStatus,
    signInWithGoogle,
    signOutUser,
    syncTripToCloud,
    deleteTripFromCloud,
    syncMetaToCloud
  } = useFirebase();

  const [state, setState] = useState<AppState>(defaultSeedState);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [activeTripTab, setActiveTripTab] = useState<string>('budget');
  const [activeDashTab, setActiveDashTab] = useState<'trips' | 'charts'>('trips');

  const hasSyncedInitialCloudRef = useRef(false);
  useEffect(() => {
    if (user && state.trips.length > 0 && !hasSyncedInitialCloudRef.current) {
      hasSyncedInitialCloudRef.current = true;
      state.trips.forEach(t => syncTripToCloud(t));
      syncMetaToCloud(state.settings, state.categories, state.sheets);
    }
  }, [user, state.trips, state.settings, state.categories, state.sheets, syncTripToCloud, syncMetaToCloud]);

  // Undo / Redo
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const isApplyingUndoRedoRef = useRef(false);

  // Status flags
  const [saveFlagVisible, setSaveFlagVisible] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ kind: string; text: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  const toastTimerRef = useRef<any>(null);
  const githubSyncTimerRef = useRef<any>(null);

  // Modals state
  const [modalType, setModalType] = useState<string | null>(null);
  const [modalPayload, setModalPayload] = useState<any>(null);

  // Print state
  const [printingTrip, setPrintingTrip] = useState<Trip | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  }, []);

  const logEvent = useCallback((action: string, detail: string) => {
    setState(prev => {
      const newLog = [{ id: uid('log'), ts: Date.now(), action, detail }, ...prev.activityLog];
      if (newLog.length > 200) newLog.length = 200;
      return { ...prev, activityLog: newLog };
    });
  }, []);

  // Save state helper with Undo snapshot tracking
  const persistState = useCallback(
    (nextState: AppState) => {
      saveStateToLocalStorage(nextState);
      snapshotHistory(nextState);

      const currentSnapshot = JSON.stringify({
        categories: nextState.categories,
        sheets: nextState.sheets,
        trips: nextState.trips,
        trash: nextState.trash,
        activityLog: nextState.activityLog
      });

      if (!isApplyingUndoRedoRef.current) {
        if (
          lastSavedSnapshotRef.current !== null &&
          lastSavedSnapshotRef.current !== currentSnapshot
        ) {
          setUndoStack(prev => {
            const next = [...prev, lastSavedSnapshotRef.current!];
            if (next.length > MAX_UNDO) next.shift();
            return next;
          });
          setRedoStack([]);
        }
        lastSavedSnapshotRef.current = currentSnapshot;
      }

      setSaveFlagVisible(true);
      setTimeout(() => setSaveFlagVisible(false), 1200);

      // Trigger debounced github sync if configured
      if (githubConfigured(nextState.settings)) {
        if (githubSyncTimerRef.current) clearTimeout(githubSyncTimerRef.current);
        setSyncStatus({ kind: 'syncing', text: '☁ sync pending…' });
        githubSyncTimerRef.current = setTimeout(async () => {
          setSyncStatus({ kind: 'syncing', text: '☁ syncing…' });
          try {
            const sha = await githubPushRemote(nextState);
            nextState.settings.githubSha = sha;
            nextState.settings.githubLastSyncAt = Date.now();
            saveStateToLocalStorage(nextState);
            const timeStr = new Date(nextState.settings.githubLastSyncAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            });
            setSyncStatus({ kind: '', text: `☁ synced ${timeStr}` });
          } catch (err: any) {
            setSyncStatus({
              kind: 'error',
              text: err.message === 'github-auth-failed' ? '☁ sync failed: check token' : '☁ sync failed'
            });
          }
        }, 4000);
      }
    },
    []
  );

  // Load initial data on mount
  useEffect(() => {
    loadInitialState().then(initialState => {
      setState(initialState);
      lastSavedSnapshotRef.current = JSON.stringify({
        categories: initialState.categories,
        sheets: initialState.sheets,
        trips: initialState.trips,
        trash: initialState.trash,
        activityLog: initialState.activityLog
      });
      if (githubConfigured(initialState.settings)) {
        setSyncStatus({ kind: '', text: '☁ GitHub Sync enabled' });
      }
    });
  }, []);

  // Update whole state with persistence
  const updateState = useCallback(
    (updater: (prev: AppState) => AppState) => {
      setState(prev => {
        const next = updater(prev);
        persistState(next);
        return next;
      });
    },
    [persistState]
  );

  // Update specific trip
  const handleUpdateTrip = useCallback(
    (updatedTrip: Trip, logAction?: { action: string; detail: string }) => {
      updateState(prev => {
        const nextTrips = prev.trips.map(t => (t.id === updatedTrip.id ? updatedTrip : t));
        let nextLog = prev.activityLog;
        if (logAction) {
          nextLog = [{ id: uid('log'), ts: Date.now(), ...logAction }, ...prev.activityLog];
          if (nextLog.length > 200) nextLog.length = 200;
        }
        return {
          ...prev,
          trips: nextTrips,
          activityLog: nextLog
        };
      });
      syncTripToCloud(updatedTrip);
    },
    [updateState, syncTripToCloud]
  );

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (!undoStack.length) {
      showToast('Nothing to undo');
      return;
    }
    const current = JSON.stringify({
      categories: state.categories,
      sheets: state.sheets,
      trips: state.trips,
      trash: state.trash,
      activityLog: state.activityLog
    });
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [...r, current]);
    setUndoStack(u => u.slice(0, u.length - 1));

    isApplyingUndoRedoRef.current = true;
    try {
      const parsed = JSON.parse(prev);
      setState(old => {
        const next = {
          ...old,
          categories: parsed.categories,
          sheets: parsed.sheets,
          trips: parsed.trips,
          trash: parsed.trash,
          activityLog: parsed.activityLog
        };
        saveStateToLocalStorage(next);
        return next;
      });
      lastSavedSnapshotRef.current = prev;
      showToast('Undone');
    } finally {
      isApplyingUndoRedoRef.current = false;
    }
  }, [undoStack, state, showToast]);

  const handleRedo = useCallback(() => {
    if (!redoStack.length) {
      showToast('Nothing to redo');
      return;
    }
    const current = JSON.stringify({
      categories: state.categories,
      sheets: state.sheets,
      trips: state.trips,
      trash: state.trash,
      activityLog: state.activityLog
    });
    const nextSnapshot = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, current]);
    setRedoStack(r => r.slice(0, r.length - 1));

    isApplyingUndoRedoRef.current = true;
    try {
      const parsed = JSON.parse(nextSnapshot);
      setState(old => {
        const next = {
          ...old,
          categories: parsed.categories,
          sheets: parsed.sheets,
          trips: parsed.trips,
          trash: parsed.trash,
          activityLog: parsed.activityLog
        };
        saveStateToLocalStorage(next);
        return next;
      });
      lastSavedSnapshotRef.current = nextSnapshot;
      showToast('Redone');
    } finally {
      isApplyingUndoRedoRef.current = false;
    }
  }, [redoStack, state, showToast]);

  // Global keyboard shortcuts for Ctrl+Z and Ctrl+Shift+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = (target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
        return;
      }
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Export & Import backup
  const handleExportBackup = () => {
    const payload = {
      categories: state.categories,
      sheets: state.sheets,
      trips: state.trips,
      trash: state.trash,
      activityLog: state.activityLog,
      _exportedByVersion: APP_VERSION
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `travel-ledger-v${APP_VERSION}-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logEvent('backup-exported', `Exported a JSON backup (v${APP_VERSION})`);
    showToast('Backup downloaded');
  };

  const handleImportBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (!parsed.trips || !Array.isArray(parsed.trips)) {
          alert('Could not read that file — is it a Travel Ledger backup?');
          return;
        }
        if (
          !window.confirm(
            `Import ${parsed.trips.length} trip(s)? Your current trips will be moved to Trash so you can recover them if needed.`
          )
        ) {
          return;
        }

        updateState(prev => {
          const trashTrips = prev.trips.map(t => ({ ...t, deletedAt: Date.now() }));
          return {
            ...prev,
            trips: parsed.trips,
            categories: parsed.categories || prev.categories,
            sheets: parsed.sheets || prev.sheets,
            trash: {
              ...prev.trash,
              trips: [...prev.trash.trips, ...trashTrips]
            },
            activityLog: [
              {
                id: uid('log'),
                ts: Date.now(),
                action: 'backup-imported',
                detail: `Imported ${parsed.trips.length} trip(s) from backup`
              },
              ...prev.activityLog
            ]
          };
        });
        showToast('Backup imported');
      } catch (_) {
        alert('Could not read that file — is it a Travel Ledger backup?');
      }
    };
    reader.readAsText(file);
  };

  // Duplicate / Delete Trip
  const handleDuplicateTrip = (trip: Trip) => {
    const copy: Trip = {
      ...JSON.parse(JSON.stringify(trip)),
      id: uid('trip'),
      name: trip.name + ' (copy)',
      year: trip.year + 1,
      status: 'upcoming',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    updateState(prev => ({
      ...prev,
      trips: [...prev.trips, copy],
      activityLog: [
        { id: uid('log'), ts: Date.now(), action: 'trip-duplicated', detail: `Duplicated "${trip.name}" as "${copy.name}"` },
        ...prev.activityLog
      ]
    }));
    setActiveTripId(copy.id);
    syncTripToCloud(copy);
    showToast('Trip duplicated');
  };

  const handleDeleteTrip = (trip: Trip) => {
    updateState(prev => ({
      ...prev,
      trips: prev.trips.filter(t => t.id !== trip.id),
      trash: {
        ...prev.trash,
        trips: [{ ...trip, deletedAt: Date.now() }, ...prev.trash.trips]
      },
      activityLog: [
        { id: uid('log'), ts: Date.now(), action: 'trip-deleted', detail: `Deleted trip "${trip.name}"` },
        ...prev.activityLog
      ]
    }));
    deleteTripFromCloud(trip.id);
    setActiveTripId(null);
    showToast('Trip moved to trash');
  };

  // Move Plan item to Research
  const handleMoveToResearch = (item: PlanItem) => {
    if (!currentTrip) return;
    const newRes: ResearchItem = {
      id: uid('res'),
      sheet: item.sheet,
      name: item.name,
      address: item.location || '',
      lat: null,
      lng: null,
      priceLevel: null,
      priority: null,
      estCost: item.cost,
      notes: item.notes || '',
      links: (item.links || []).map(l => ({ ...l, id: uid('link') })),
      status: 'researching',
      linkedPlanItemId: null,
      createdAt: Date.now()
    };

    handleUpdateTrip(
      {
        ...currentTrip,
        planItems: currentTrip.planItems.filter(p => p.id !== item.id),
        research: [...currentTrip.research, newRes]
      },
      { action: 'plan-moved-to-research', detail: `Moved "${item.name}" from Plan back to Research on ${currentTrip.name}` }
    );
    showToast('Moved to Research');
  };

  // Promote Research item to Plan
  const handlePromoteToPlan = (item: ResearchItem) => {
    if (!currentTrip) return;
    const newPlan: PlanItem = {
      id: uid('plan'),
      sheet: item.sheet,
      name: item.name,
      status: 'idea',
      date: currentTrip.startDate || null,
      endDate: null,
      time: null,
      dayNumber: currentTrip.timelineMode === 'days' ? 1 : null,
      dayNumberEnd: null,
      location: item.address || '',
      links: (item.links || []).map(l => ({ ...l, id: uid('link') })),
      cost: item.estCost,
      linkedExpenseId: null,
      actualExpenseId: null,
      notes: item.notes || '',
      visited: false,
      estimateCategory: resolveExpenseCategory(item.sheet, state.categories)
    };

    const updatedResearch = currentTrip.research.map(r =>
      r.id === item.id ? { ...r, status: 'promoted' as const, linkedPlanItemId: newPlan.id } : r
    );

    handleUpdateTrip(
      {
        ...currentTrip,
        planItems: [...currentTrip.planItems, newPlan],
        research: updatedResearch
      },
      { action: 'research-promoted', detail: `Promoted "${item.name}" to Plan on ${currentTrip.name}` }
    );

    setActiveTripTab('plan');
    setModalType('editPlanItem');
    setModalPayload({ item: newPlan });
    showToast('Promoted — set a date/day to place it on the timeline');
  };

  // Print export handler
  const handleExportPDF = (trip: Trip) => {
    setPrintingTrip(trip);
    logEvent('plan-pdf-exported', `Exported Plan PDF for ${trip.name}`);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const currentTrip = state.trips.find(t => t.id === activeTripId) || null;

  return (
    <div id="travel-ledger-root">
      {quotaExceeded && (
        <div style={{
          background: '#fffbeb',
          borderBottom: '1px solid #fde68a',
          color: '#78350f',
          padding: '10px 16px',
          fontSize: '13px',
          textAlign: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 9999,
          boxShadow: '0 2px 4px rgba(0,0,0,0.06)'
        }}>
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'underline', fontWeight: 600, color: '#451a03' }}
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}
      <div className="wrap">
        <Header
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          saveFlagVisible={saveFlagVisible}
          syncStatus={syncStatus}
          githubConfigured={githubConfigured(state.settings)}
          onGithubPush={async () => {
            try {
              setSyncStatus({ kind: 'syncing', text: '☁ pushing…' });
              await githubPushRemote(state);
              setSyncStatus({ kind: '', text: '☁ pushed successfully' });
              showToast('Pushed to GitHub');
            } catch (err: any) {
              setSyncStatus({ kind: 'error', text: '☁ push failed' });
              showToast('Push failed');
            }
          }}
          onGithubPull={async () => {
            try {
              setSyncStatus({ kind: 'syncing', text: '☁ pulling…' });
              const remote = await githubFetchRemote(state.settings);
              if (remote.exists && remote.json) {
                if (
                  window.confirm(
                    `Pull ${remote.json.trips?.length || 0} trip(s) from GitHub? Current data will be moved to Trash first.`
                  )
                ) {
                  updateState(prev => ({
                    ...prev,
                    trips: remote.json.trips || prev.trips,
                    categories: remote.json.categories || prev.categories,
                    sheets: remote.json.sheets || prev.sheets
                  }));
                  showToast('Pulled from GitHub');
                }
              }
            } catch (_) {
              showToast('Pull failed');
            }
          }}
          onOpenChangelog={() => setModalType('changelog')}
          onHomeClick={() => setActiveTripId(null)}
          onOpenCurrencyConverter={() => setModalType('currencyConverter')}
          user={user}
          cloudSyncStatus={cloudSyncStatus}
          onSignInGoogle={signInWithGoogle}
          onSignOut={signOutUser}
        />

        {!currentTrip ? (
          <>
            <KPIBoard trips={state.trips} />
            <DashboardView
              trips={state.trips}
              categories={state.categories}
              sheets={state.sheets}
              activeDashTab={activeDashTab}
              setActiveDashTab={setActiveDashTab}
              onOpenTrip={(id, initialTab) => {
                setActiveTripId(id);
                if (initialTab) setActiveTripTab(initialTab);
                else setActiveTripTab('budget');
              }}
              onNewTrip={() => setModalType('newTrip')}
              onManageCategories={() => setModalType('categories')}
            />
          </>
        ) : (
          <TripDetailView
            trip={currentTrip}
            categories={state.categories}
            sheets={state.sheets}
            settings={state.settings}
            activeTripTab={activeTripTab}
            setActiveTripTab={setActiveTripTab}
            onBackToDashboard={() => setActiveTripId(null)}
            onUpdateTrip={handleUpdateTrip}
            onEditTrip={() => {
              setModalType('editTrip');
              setModalPayload({ trip: currentTrip });
            }}
            onDuplicateTrip={() => handleDuplicateTrip(currentTrip)}
            onDeleteTrip={() => handleDeleteTrip(currentTrip)}
            onOpenReorderTabs={() => setModalType('reorderTabs')}
            onOpenAddExpenseModal={() => setModalType('addExpense')}
            onOpenAddEstimateModal={() => setModalType('addEstimate')}
            onOpenAddPlanModal={(defaultSheet, prefill) => {
              setModalType('addPlanItem');
              setModalPayload({ defaultSheet, prefill });
            }}
            onOpenEditPlanModal={item => {
              setModalType('editPlanItem');
              setModalPayload({ item });
            }}
            onMoveToResearch={handleMoveToResearch}
            onOpenAddResearchModal={defaultSheet => {
              setModalType('addResearchItem');
              setModalPayload({ defaultSheet });
            }}
            onOpenEditResearchModal={item => {
              setModalType('editResearchItem');
              setModalPayload({ item });
            }}
            onPromoteToPlan={handlePromoteToPlan}
            onOpenAddPackingModal={defaultCat => {
              setModalType('addPackingItem');
              setModalPayload({ defaultCat });
            }}
            onManageSheets={() => setModalType('manageSheets')}
            onOpenMapSettings={() => setModalType('mapSettings')}
            onExportPDF={() => handleExportPDF(currentTrip)}
            onShowToast={showToast}
            onOpenCurrencyConverter={() => setModalType('currencyConverter')}
          />
        )}

        <Footer
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
          onOpenTrash={() => setModalType('trash')}
          onOpenActivityLog={() => setModalType('activityLog')}
          onOpenGithubSync={() => setModalType('githubSync')}
          onOpenBackupHistory={() => setModalType('backupHistory')}
          onOpenChangelog={() => setModalType('changelog')}
        />

        {/* Toast */}
        <div className={`toast ${toastMessage ? 'show' : ''}`}>
          {toastMessage}
        </div>

        {/* Printable Area */}
        <PrintArea trip={printingTrip} sheets={state.sheets} />

        {/* Modals */}
        {modalType === 'newTrip' && (
          <TripModal
            onClose={() => setModalType(null)}
            onSave={tripData => {
              const newT: Trip = {
                id: uid('trip'),
                name: tripData.name!,
                year: tripData.year!,
                status: tripData.status!,
                budget: tripData.budget!,
                startDate: tripData.startDate || null,
                endDate: tripData.endDate || null,
                travelers: tripData.travelers || 2,
                notes: '',
                expenses: [],
                planItems: [],
                timelineMode: 'days',
                timelineManualOrder: true,
                research: [],
                packingList: [],
                luggageBags: [],
                outfits: [],
                hauls: [],
                loungeVisits: [],
                country: tripData.country || '',
                countryGuessed: false,
                homeCurrency: tripData.homeCurrency || state.settings.homeCurrency || 'GBP',
                defaultExpenseCurrency: tripData.defaultExpenseCurrency || 'EUR',
                mapEmbedUrl: '',
                manualEstimates: [],
                hiddenSheets: [],
                sectionMapUrls: {},
                createdAt: Date.now(),
                updatedAt: Date.now()
              };
              updateState(prev => ({
                ...prev,
                trips: [...prev.trips, newT],
                activityLog: [
                  { id: uid('log'), ts: Date.now(), action: 'trip-created', detail: `Created trip "${newT.name}"` },
                  ...prev.activityLog
                ]
              }));
              syncTripToCloud(newT);
              setActiveTripId(newT.id);
              setModalType(null);
            }}
          />
        )}

        {modalType === 'editTrip' && modalPayload?.trip && (
          <TripModal
            existing={modalPayload.trip}
            onClose={() => setModalType(null)}
            onSave={tripData => {
              handleUpdateTrip(
                {
                  ...modalPayload.trip,
                  ...tripData,
                  updatedAt: Date.now()
                },
                { action: 'trip-edited', detail: `Updated details for "${tripData.name}"` }
              );
              setModalType(null);
            }}
          />
        )}

        {modalType === 'addExpense' && currentTrip && (
          <ExpenseModal
            categories={state.categories}
            onClose={() => setModalType(null)}
            onAddNewCategory={(name, color) => {
              updateState(prev => ({
                ...prev,
                categories: [...prev.categories, { name, color }]
              }));
            }}
            onSave={expData => {
              const newExp = {
                id: uid('exp'),
                description: expData.description,
                category: expData.category,
                quantity: expData.quantity,
                unitCost: expData.unitCost,
                currency: expData.currency,
                originalCost: expData.originalCost,
                exchangeRate: expData.exchangeRate,
                homeCurrency: expData.homeCurrency
              };
              handleUpdateTrip(
                {
                  ...currentTrip,
                  expenses: [...currentTrip.expenses, newExp],
                  updatedAt: Date.now()
                },
                { action: 'expense-added', detail: `Added "${newExp.description}" (${fmt(newExp.quantity * newExp.unitCost)}) to ${currentTrip.name}` }
              );
              setModalType(null);
            }}
          />
        )}

        {modalType === 'addEstimate' && currentTrip && (
          <AddEstimateModal
            categories={state.categories}
            onClose={() => setModalType(null)}
            onSave={estData => {
              const newEst = {
                id: uid('est'),
                description: estData.description,
                category: estData.category,
                quantity: estData.quantity,
                unitCost: estData.unitCost,
                currency: estData.currency,
                originalCost: estData.originalCost,
                exchangeRate: estData.exchangeRate,
                homeCurrency: estData.homeCurrency
              };
              handleUpdateTrip(
                {
                  ...currentTrip,
                  manualEstimates: [...currentTrip.manualEstimates, newEst],
                  updatedAt: Date.now()
                },
                { action: 'estimate-added', detail: `Added estimate "${newEst.description}" (${fmt(newEst.quantity * newEst.unitCost)}) to ${currentTrip.name}` }
              );
              setModalType(null);
            }}
          />
        )}

        {modalType === 'addPlanItem' && currentTrip && (
          <PlanItemModal
            trip={currentTrip}
            sheets={state.sheets}
            categories={state.categories}
            defaultSheet={modalPayload?.defaultSheet}
            prefill={modalPayload?.prefill}
            onClose={() => setModalType(null)}
            onSave={(itemData, wantLinkExpense) => {
              const newItem: PlanItem = {
                id: uid('plan'),
                sheet: itemData.sheet!,
                name: itemData.name!,
                status: itemData.status || 'idea',
                date: itemData.date || null,
                endDate: itemData.endDate || null,
                time: itemData.time || null,
                dayNumber: itemData.dayNumber || null,
                dayNumberEnd: itemData.dayNumberEnd || null,
                location: itemData.location || '',
                links: itemData.links || [],
                cost: itemData.cost != null ? itemData.cost : null,
                linkedExpenseId: null,
                actualExpenseId: null,
                notes: itemData.notes || '',
                visited: false,
                estimateCategory: itemData.estimateCategory,
                estimateQuantity: 1,
                currency: itemData.currency,
                originalCost: itemData.originalCost,
                exchangeRate: itemData.exchangeRate,
                homeCurrency: itemData.homeCurrency
              };

              let updatedExpenses = currentTrip.expenses;
              if (wantLinkExpense && newItem.cost != null && newItem.cost > 0) {
                const linkedExp = {
                  id: uid('exp'),
                  description: newItem.name,
                  category: newItem.estimateCategory || 'Other',
                  quantity: 1,
                  unitCost: newItem.cost,
                  currency: newItem.currency,
                  originalCost: newItem.originalCost,
                  exchangeRate: newItem.exchangeRate,
                  homeCurrency: newItem.homeCurrency
                };
                updatedExpenses = [...updatedExpenses, linkedExp];
                newItem.linkedExpenseId = linkedExp.id;
              }

              handleUpdateTrip(
                {
                  ...currentTrip,
                  planItems: [...currentTrip.planItems, newItem],
                  expenses: updatedExpenses,
                  updatedAt: Date.now()
                },
                { action: 'plan-item-added', detail: `Added "${newItem.name}" (${newItem.sheet}) on ${currentTrip.name}` }
              );
              setModalType(null);
            }}
          />
        )}

        {modalType === 'editPlanItem' && currentTrip && modalPayload?.item && (
          <PlanItemModal
            trip={currentTrip}
            sheets={state.sheets}
            categories={state.categories}
            existing={modalPayload.item}
            onClose={() => setModalType(null)}
            onSave={(itemData, wantLinkExpense) => {
              const copyTrip = { ...currentTrip };
              let updatedExpenses = [...copyTrip.expenses];
              const cost = itemData.cost != null ? itemData.cost : null;

              if (wantLinkExpense && cost != null && cost > 0) {
                if (modalPayload.item.linkedExpenseId) {
                  updatedExpenses = updatedExpenses.map(e =>
                    e.id === modalPayload.item.linkedExpenseId
                      ? {
                          ...e,
                          description: itemData.name!,
                          unitCost: cost,
                          currency: itemData.currency,
                          originalCost: itemData.originalCost,
                          exchangeRate: itemData.exchangeRate,
                          homeCurrency: itemData.homeCurrency
                        }
                      : e
                  );
                } else {
                  const linkedExp = {
                    id: uid('exp'),
                    description: itemData.name!,
                    category: itemData.estimateCategory || 'Other',
                    quantity: 1,
                    unitCost: cost,
                    currency: itemData.currency,
                    originalCost: itemData.originalCost,
                    exchangeRate: itemData.exchangeRate,
                    homeCurrency: itemData.homeCurrency
                  };
                  updatedExpenses.push(linkedExp);
                  itemData.linkedExpenseId = linkedExp.id;
                }
              } else if (modalPayload.item.linkedExpenseId) {
                updatedExpenses = updatedExpenses.filter(e => e.id !== modalPayload.item.linkedExpenseId);
                itemData.linkedExpenseId = null;
              }

              const updatedPlan = copyTrip.planItems.map(p =>
                p.id === modalPayload.item.id ? { ...p, ...itemData } : p
              );

              handleUpdateTrip(
                {
                  ...copyTrip,
                  planItems: updatedPlan,
                  expenses: updatedExpenses,
                  updatedAt: Date.now()
                },
                { action: 'plan-item-edited', detail: `Updated "${itemData.name}" on ${currentTrip.name}` }
              );
              setModalType(null);
            }}
          />
        )}

        {modalType === 'addResearchItem' && currentTrip && (
          <ResearchItemModal
            sheets={state.sheets}
            defaultSheet={modalPayload?.defaultSheet}
            settings={state.settings}
            onClose={() => setModalType(null)}
            onSave={itemData => {
              const newRes: ResearchItem = {
                id: uid('res'),
                sheet: itemData.sheet!,
                name: itemData.name!,
                address: itemData.address || '',
                lat: itemData.lat ?? null,
                lng: itemData.lng ?? null,
                priceLevel: itemData.priceLevel ?? null,
                priority: itemData.priority ?? null,
                estCost: itemData.estCost ?? null,
                notes: itemData.notes || '',
                links: itemData.links || [],
                status: itemData.status || 'researching',
                linkedPlanItemId: null,
                createdAt: Date.now()
              };

              handleUpdateTrip(
                {
                  ...currentTrip,
                  research: [...currentTrip.research, newRes],
                  updatedAt: Date.now()
                },
                { action: 'research-added', detail: `Added "${newRes.name}" to ${currentTrip.name} research` }
              );
              setModalType(null);
            }}
          />
        )}

        {modalType === 'editResearchItem' && currentTrip && modalPayload?.item && (
          <ResearchItemModal
            sheets={state.sheets}
            existing={modalPayload.item}
            settings={state.settings}
            onClose={() => setModalType(null)}
            onSave={itemData => {
              const updatedResearch = currentTrip.research.map(r =>
                r.id === modalPayload.item.id ? { ...r, ...itemData } : r
              );
              handleUpdateTrip(
                {
                  ...currentTrip,
                  research: updatedResearch,
                  updatedAt: Date.now()
                },
                { action: 'research-edited', detail: `Updated "${itemData.name}" in ${currentTrip.name} research` }
              );
              setModalType(null);
            }}
          />
        )}

        {modalType === 'addPackingItem' && currentTrip && (
          <PackingItemModal
            defaultCategory={modalPayload?.defaultCat}
            onClose={() => setModalType(null)}
            onSave={itemData => {
              const newPack = {
                id: uid('pack'),
                name: itemData.name,
                category: itemData.category,
                qty: itemData.qty,
                packed: false
              };
              handleUpdateTrip(
                {
                  ...currentTrip,
                  packingList: [...currentTrip.packingList, newPack],
                  updatedAt: Date.now()
                },
                { action: 'packing-item-added', detail: `Added "${newPack.name}" to ${currentTrip.name} packing list` }
              );
              setModalType(null);
            }}
          />
        )}

        {modalType === 'categories' && (
          <CategoriesModal
            categories={state.categories}
            trips={state.trips}
            onClose={() => setModalType(null)}
            onUpdateCategories={newCats => {
              updateState(prev => ({ ...prev, categories: newCats }));
            }}
            onShowToast={showToast}
          />
        )}

        {modalType === 'manageSheets' && (
          <ManageSheetsModal
            trip={currentTrip}
            sheets={state.sheets}
            onClose={() => setModalType(null)}
            onUpdateSheets={newSheets => {
              updateState(prev => ({ ...prev, sheets: newSheets }));
            }}
            onUpdateTripHiddenSheets={hidden => {
              if (currentTrip) {
                handleUpdateTrip({ ...currentTrip, hiddenSheets: hidden });
              }
            }}
            onShowToast={showToast}
          />
        )}

        {modalType === 'reorderTabs' && (
          <ReorderTabsModal
            tabOrder={state.settings.tripTabOrder}
            disabledTabs={state.settings.disabledTabs}
            onClose={() => setModalType(null)}
            onUpdateTabOrder={newOrder => {
              updateState(prev => ({
                ...prev,
                settings: { ...prev.settings, tripTabOrder: newOrder }
              }));
            }}
            onUpdateDisabledTabs={newDisabled => {
              updateState(prev => ({
                ...prev,
                settings: { ...prev.settings, disabledTabs: newDisabled }
              }));
            }}
          />
        )}

        {modalType === 'trash' && (
          <TrashModal
            trash={state.trash}
            onClose={() => setModalType(null)}
            onRestoreTrip={idx => {
              const tripToRestore = state.trash.trips[idx];
              const cleanTrip = { ...tripToRestore };
              delete (cleanTrip as any).deletedAt;
              updateState(prev => ({
                ...prev,
                trips: [...prev.trips, cleanTrip],
                trash: {
                  ...prev.trash,
                  trips: prev.trash.trips.filter((_, i) => i !== idx)
                },
                activityLog: [
                  { id: uid('log'), ts: Date.now(), action: 'trip-restored', detail: `Restored trip "${cleanTrip.name}" from trash` },
                  ...prev.activityLog
                ]
              }));
              showToast('Trip restored');
            }}
            onRestoreExpense={idx => {
              const item = state.trash.expenses[idx];
              const trip = state.trips.find(t => t.id === item.tripId);
              if (!trip) {
                alert('The original trip no longer exists, so this expense cannot be restored.');
                return;
              }
              const updatedExpenses = [...trip.expenses, item.expense];
              handleUpdateTrip(
                {
                  ...trip,
                  expenses: updatedExpenses,
                  updatedAt: Date.now()
                },
                { action: 'expense-restored', detail: `Restored "${item.expense.description}" to ${trip.name}` }
              );
              updateState(prev => ({
                ...prev,
                trash: {
                  ...prev.trash,
                  expenses: prev.trash.expenses.filter((_, i) => i !== idx)
                }
              }));
              showToast('Expense restored');
            }}
            onEmptyTrash={() => {
              updateState(prev => ({
                ...prev,
                trash: { trips: [], expenses: [] },
                activityLog: [
                  { id: uid('log'), ts: Date.now(), action: 'trash-emptied', detail: 'Trash emptied permanently' },
                  ...prev.activityLog
                ]
              }));
              showToast('Trash emptied');
            }}
          />
        )}

        {modalType === 'activityLog' && (
          <ActivityLogModal
            log={state.activityLog}
            onClose={() => setModalType(null)}
          />
        )}

        {modalType === 'backupHistory' && (
          <BackupManagerModal
            currentState={state}
            localHistory={loadHistory()}
            onClose={() => setModalType(null)}
            onRestoreState={(restoredState, note) => {
              updateState(prev => {
                const currentAsTrash = prev.trips.map(t => ({ ...t, deletedAt: Date.now() }));
                return {
                  ...restoredState,
                  trash: {
                    ...restoredState.trash,
                    trips: [...(restoredState.trash?.trips || []), ...currentAsTrash]
                  },
                  activityLog: [
                    {
                      id: uid('log'),
                      ts: Date.now(),
                      action: 'history-restored',
                      detail: `Full ledger restored: ${note}`
                    },
                    ...(restoredState.activityLog || prev.activityLog)
                  ]
                };
              });
              setModalType(null);
              showToast('Ledger successfully restored');
            }}
            onRestoreSingleTrip={tripToRestore => {
              updateState(prev => {
                const exists = prev.trips.some(t => t.id === tripToRestore.id);
                const updatedTrips = exists
                  ? prev.trips.map(t => (t.id === tripToRestore.id ? tripToRestore : t))
                  : [...prev.trips, tripToRestore];
                return {
                  ...prev,
                  trips: updatedTrips,
                  activityLog: [
                    {
                      id: uid('log'),
                      ts: Date.now(),
                      action: 'trip-restored',
                      detail: `Restored trip "${tripToRestore.name}" from backup snapshot`
                    },
                    ...prev.activityLog
                  ]
                };
              });
              showToast(`Restored "${tripToRestore.name}"`);
            }}
            onShowToast={showToast}
          />
        )}

        {modalType === 'githubSync' && (
          <GithubSyncModal
            settings={state.settings}
            onClose={() => setModalType(null)}
            onSaveSettings={newSettings => {
              updateState(prev => ({
                ...prev,
                settings: newSettings
              }));
              showToast('Settings saved');
            }}
            onPushNow={async () => {
              const sha = await githubPushRemote(state);
              updateState(prev => ({
                ...prev,
                settings: {
                  ...prev.settings,
                  githubSha: sha,
                  githubLastSyncAt: Date.now()
                }
              }));
              showToast('Pushed to GitHub');
            }}
            onPullNow={async () => {
              const remote = await githubFetchRemote(state.settings);
              if (!remote.exists || !remote.json) {
                throw new Error('github-no-remote');
              }
              if (
                window.confirm(
                  `Pull ${remote.json.trips?.length || 0} trip(s) from GitHub? Current data will be moved to Trash first.`
                )
              ) {
                updateState(prev => {
                  const currentAsTrash = prev.trips.map(t => ({ ...t, deletedAt: Date.now() }));
                  return {
                    ...prev,
                    trips: remote.json.trips || prev.trips,
                    categories: remote.json.categories || prev.categories,
                    sheets: remote.json.sheets || prev.sheets,
                    trash: {
                      ...prev.trash,
                      trips: [...prev.trash.trips, ...currentAsTrash]
                    },
                    settings: {
                      ...prev.settings,
                      githubSha: remote.sha,
                      githubLastSyncAt: Date.now()
                    }
                  };
                });
                showToast('Pulled from GitHub');
              }
            }}
          />
        )}

        {modalType === 'mapSettings' && (
          <MapSettingsModal
            apiKey={state.settings.mapsApiKey}
            onClose={() => setModalType(null)}
            onSave={newKey => {
              updateState(prev => ({
                ...prev,
                settings: { ...prev.settings, mapsApiKey: newKey }
              }));
              setModalType(null);
              showToast('Map settings saved');
            }}
          />
        )}

        {modalType === 'changelog' && (
          <VersionHistoryModal isOpen={true} onClose={() => setModalType(null)} />
        )}

        {modalType === 'currencyConverter' && (
          <CurrencyConverterModal
            trip={currentTrip}
            settings={state.settings}
            onClose={() => setModalType(null)}
            onUpdateTrip={updated => {
              handleUpdateTrip(updated, {
                action: 'currency-settings-updated',
                detail: `Updated currency settings for ${updated.name}`
              });
              showToast('Trip currency updated');
            }}
            onSaveSettings={newSettings => {
              updateState(prev => ({ ...prev, settings: newSettings }));
              showToast('Default currency updated in settings');
            }}
          />
        )}
      </div>
    </div>
  );
};
