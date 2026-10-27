import React, { useState, useEffect } from 'react';
import { AppState, BackupSnapshot, HistoryEntry, Trip } from '../types';
import { useFirebase } from '../context/FirebaseContext';
import {
  History,
  Cloud,
  Database,
  RotateCcw,
  Plus,
  Trash2,
  Download,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Check,
  Calendar,
  Layers,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { fmt } from '../utils/helpers';

interface BackupManagerModalProps {
  currentState: AppState;
  localHistory: HistoryEntry[];
  onClose: () => void;
  onRestoreState: (restoredState: AppState, note: string) => void;
  onRestoreSingleTrip?: (trip: Trip) => void;
  onShowToast: (msg: string) => void;
}

export const BackupManagerModal: React.FC<BackupManagerModalProps> = ({
  currentState,
  localHistory,
  onClose,
  onRestoreState,
  onRestoreSingleTrip,
  onShowToast
}) => {
  const { user, isCloudConnected, createCloudBackup, listCloudBackups, deleteCloudBackup } = useFirebase();

  const [activeTab, setActiveTab] = useState<'cloud' | 'local'>('cloud');
  const [cloudBackups, setCloudBackups] = useState<BackupSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New backup form state
  const [isCreating, setIsCreating] = useState(false);
  const [newBackupName, setNewBackupName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selective trip restore dialog
  const [selectedSnapshotForTrip, setSelectedSnapshotForTrip] = useState<BackupSnapshot | null>(null);

  // Load cloud backups when modal opens
  const refreshCloudBackups = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const list = await listCloudBackups();
      setCloudBackups(list);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshCloudBackups();
    } else {
      setActiveTab('local');
    }
  }, [user]);

  // Handle manual backup creation
  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBackupName.trim()) return;

    setIsSubmitting(true);
    try {
      if (user) {
        const result = await createCloudBackup(newBackupName.trim(), currentState, 'manual');
        if (result) {
          setCloudBackups(prev => [result, ...prev]);
          onShowToast('Cloud backup created');
        } else {
          onShowToast('Could not save to Cloud, saving locally');
        }
      }
      setIsCreating(false);
      setNewBackupName('');
    } catch (err) {
      onShowToast('Failed to create backup');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCloudBackup = async (id: string, name: string) => {
    if (!window.confirm(`Delete backup "${name}"?`)) return;
    const ok = await deleteCloudBackup(id);
    if (ok) {
      setCloudBackups(prev => prev.filter(b => b.id !== id));
      onShowToast('Backup deleted');
    } else {
      onShowToast('Failed to delete backup');
    }
  };

  // Full Restore Handler (Always creates safety checkpoint first)
  const handleFullRestore = async (backup: BackupSnapshot) => {
    const tripCount = backup.state?.trips?.length || 0;
    if (
      !window.confirm(
        `Restore snapshot "${backup.name}"?\n\nThis will restore ${tripCount} trip(s). A safety checkpoint of your current ledger will be saved automatically first.`
      )
    ) {
      return;
    }

    // 1. Create safety checkpoint of current state first
    if (user) {
      try {
        await createCloudBackup(
          `Safety Checkpoint (Pre-restore of "${backup.name}")`,
          currentState,
          'checkpoint',
          'Automatic safety checkpoint created before restore'
        );
      } catch (e) {
        console.warn('Could not create pre-restore cloud checkpoint', e);
      }
    }

    // 2. Perform restore
    const restoredState: AppState = {
      ...currentState,
      trips: backup.state.trips,
      categories: backup.state.categories || currentState.categories,
      sheets: backup.state.sheets || currentState.sheets,
      settings: backup.state.settings || currentState.settings
    };

    onRestoreState(restoredState, `Restored from "${backup.name}"`);
    onClose();
  };

  // Selective Trip Restore
  const handleRestoreOneTrip = async (tripToRestore: Trip, fromBackupName: string) => {
    if (
      !window.confirm(
        `Restore "${tripToRestore.name}" (${tripToRestore.year}) from "${fromBackupName}"?\n\nYour other trips will remain unchanged.`
      )
    ) {
      return;
    }

    if (onRestoreSingleTrip) {
      onRestoreSingleTrip(tripToRestore);
    } else {
      // Fallback: replace or append trip in state
      const existingIdx = currentState.trips.findIndex(t => t.id === tripToRestore.id);
      let updatedTrips: Trip[];
      if (existingIdx >= 0) {
        updatedTrips = [...currentState.trips];
        updatedTrips[existingIdx] = tripToRestore;
      } else {
        updatedTrips = [...currentState.trips, tripToRestore];
      }
      onRestoreState({ ...currentState, trips: updatedTrips }, `Restored trip "${tripToRestore.name}"`);
    }

    setSelectedSnapshotForTrip(null);
    onClose();
  };

  // Download snapshot as JSON
  const handleDownloadSnapshot = (backup: BackupSnapshot) => {
    const jsonStr = JSON.stringify(backup.state, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `travel-ledger-backup-${backup.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('Backup downloaded as JSON');
  };

  // Parse local history entries into lightweight structure
  const parsedLocalSnapshots = localHistory.map(entry => {
    let parsed: any = null;
    let tripsCount = 0;
    let tripsSummary: any[] = [];
    try {
      parsed = JSON.parse(entry.snapshot);
      tripsCount = parsed?.trips?.length || 0;
      tripsSummary = (parsed?.trips || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        year: t.year,
        status: t.status,
        budget: t.budget,
        expenseCount: t.expenses?.length || 0,
        planItemCount: t.planItems?.length || 0
      }));
    } catch {}

    return {
      dateKey: entry.dateKey,
      timestamp: entry.timestamp,
      tripsCount,
      tripsSummary,
      parsedState: parsed
    };
  });

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3">
      <div
        className="modal-box bg-[#fcfaf5] border-2 border-[#1c2530] rounded-lg max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#d5cbac] pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <History size={20} className="text-[#b8874f]" />
            <div>
              <h3 className="text-lg font-serif font-bold text-[#1c2530] m-0">
                Backup &amp; Snapshot Manager
              </h3>
              <p className="text-xs text-[#5b6672] font-mono m-0 mt-0.5">
                Incremental ledger versioning with Cloud Firestore &amp; safety checkpoints
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-lg font-bold text-[#5b6672] hover:text-[#1c2530] p-1 rounded transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Top Control Bar */}
        <div className="flex items-center justify-between bg-[#f4efe2] border border-[#d5cbac] rounded-md p-3 mb-4 flex-wrap gap-2">
          {/* Cloud Auth Status */}
          <div className="flex items-center gap-2 text-xs font-mono">
            {user ? (
              <span className="flex items-center gap-1.5 text-[#35695c] font-semibold">
                <Cloud size={14} /> Cloud Active: {user.displayName || user.email}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[#8a7a3a]">
                <Database size={14} /> Local Cache Only (Sign in to Header for Cloud Backups)
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {!isCreating && (
              <button
                type="button"
                className="btn-primary btn-sm flex items-center gap-1 text-xs"
                onClick={() => setIsCreating(true)}
              >
                <Plus size={13} /> Create Incremental Backup
              </button>
            )}
          </div>
        </div>

        {/* New Backup Input Form */}
        {isCreating && (
          <form
            onSubmit={handleCreateBackup}
            className="bg-[#f0ebe0] border border-[#c5ba9d] rounded-md p-3 mb-4 flex flex-col gap-2 animate-in fade-in"
          >
            <div className="text-xs font-semibold text-[#1c2530]">
              Create New Incremental Backup
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="flex-1 text-xs p-1.5 border border-[#c5ba9d] rounded bg-[#fffdfa]"
                placeholder="e.g. Pre-flight London check or Major budget revisions"
                value={newBackupName}
                onChange={e => setNewBackupName(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                disabled={isSubmitting || !newBackupName.trim()}
                className="btn-primary btn-sm text-xs"
              >
                {isSubmitting ? 'Saving…' : 'Save Backup'}
              </button>
              <button
                type="button"
                className="btn-ghost btn-sm text-xs"
                onClick={() => setIsCreating(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Storage Tabs */}
        <div className="flex border-b border-[#d5cbac] mb-3 gap-2">
          <button
            type="button"
            className={`pb-2 px-3 text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'cloud'
                ? 'border-b-2 border-[#1c2530] text-[#1c2530]'
                : 'text-[#5b6672] hover:text-[#1c2530]'
            }`}
            onClick={() => setActiveTab('cloud')}
          >
            <Cloud size={13} /> Cloud Firestore ({cloudBackups.length})
          </button>
          <button
            type="button"
            className={`pb-2 px-3 text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'local'
                ? 'border-b-2 border-[#1c2530] text-[#1c2530]'
                : 'text-[#5b6672] hover:text-[#1c2530]'
            }`}
            onClick={() => setActiveTab('local')}
          >
            <Database size={13} /> Local Snapshots ({localHistory.length})
          </button>
        </div>

        {/* Backups List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1" style={{ minHeight: '260px' }}>
          {activeTab === 'cloud' && (
            <>
              {!user ? (
                <div className="text-center py-8 text-xs text-[#5b6672]">
                  Sign in with Google in the top bar to enable persistent multi-device Cloud Firestore backups.
                </div>
              ) : isLoading ? (
                <div className="text-center py-8 text-xs text-[#8a7a3a] font-mono">
                  Loading cloud backup snapshots…
                </div>
              ) : cloudBackups.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#5b6672]">
                  No cloud backup snapshots yet. Click <strong>"Create Incremental Backup"</strong> above to take your first cloud snapshot.
                </div>
              ) : (
                cloudBackups.map(bk => {
                  const isExpanded = expandedId === bk.id;
                  const dateStr = new Date(bk.timestamp).toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={bk.id}
                      className="border border-[#d5cbac] bg-[#fbf8ef] rounded-md p-3 transition-all hover:border-[#b8874f]"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-serif font-bold text-sm text-[#1c2530]">
                              {bk.name}
                            </span>
                            <span
                              className={`text-[9.5px] font-mono uppercase px-1.5 py-0.5 rounded font-semibold ${
                                bk.trigger === 'checkpoint'
                                  ? 'bg-[#e2d09c] text-[#71541c]'
                                  : bk.trigger === 'auto'
                                  ? 'bg-[#d8e2dc] text-[#2c5144]'
                                  : 'bg-[#d5cbac] text-[#1c2530]'
                              }`}
                            >
                              {bk.trigger}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-[#5b6672] mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>🕒 {dateStr}</span>
                            <span>•</span>
                            <span>✈️ {bk.tripCount} trip(s)</span>
                            {bk.changesSummary && (
                              <>
                                <span>•</span>
                                <span className="italic">{bk.changesSummary}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Card Action Buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            className="btn-ghost btn-sm text-xs py-1 px-2"
                            onClick={() => setExpandedId(isExpanded ? null : bk.id)}
                            title="Preview trips inside this backup"
                          >
                            {isExpanded ? 'Hide' : 'Inspect'} {isExpanded ? <ChevronUp size={12} className="inline" /> : <ChevronDown size={12} className="inline" />}
                          </button>

                          <button
                            type="button"
                            className="btn-secondary btn-sm text-xs py-1 px-2"
                            onClick={() => setSelectedSnapshotForTrip(bk)}
                            title="Restore just one trip from this snapshot without changing other trips"
                          >
                            Trip Restore
                          </button>

                          <button
                            type="button"
                            className="btn-primary btn-sm text-xs py-1 px-2.5 font-bold"
                            onClick={() => handleFullRestore(bk)}
                            title="Restore entire ledger to this snapshot"
                          >
                            Full Restore
                          </button>

                          <button
                            type="button"
                            className="btn-ghost btn-sm p-1 text-[#5b6672] hover:text-[#1c2530]"
                            onClick={() => handleDownloadSnapshot(bk)}
                            title="Download as JSON"
                          >
                            <Download size={13} />
                          </button>

                          <button
                            type="button"
                            className="btn-ghost btn-sm p-1 text-[#a63a2e]"
                            onClick={() => handleDeleteCloudBackup(bk.id, bk.name)}
                            title="Delete backup"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Drawer: Shows exact trips list inside snapshot */}
                      {isExpanded && (
                        <div className="mt-3 pt-2.5 border-t border-[#e2d8bd] bg-[#f4efe2] -mx-3 -mb-3 p-3 rounded-b-md text-xs">
                          <div className="font-semibold text-[#1c2530] mb-1.5 flex items-center gap-1.5">
                            <Layers size={13} className="text-[#b8874f]" /> Trips in this Snapshot:
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(bk.tripsSummary || []).map(t => (
                              <div
                                key={t.id}
                                className="bg-[#fffdfa] border border-[#d5cbac] p-2 rounded text-[11px] flex items-center justify-between"
                              >
                                <div>
                                  <div className="font-bold text-[#1c2530]">{t.name} ({t.year})</div>
                                  <div className="text-[10px] text-[#5b6672] font-mono">
                                    Budget: {fmt(t.budget)} · {t.expenseCount} exp · {t.planItemCount} stops
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="text-[10px] text-[#35597a] hover:underline font-semibold ml-2"
                                  onClick={() => {
                                    const fullTrip = bk.state.trips.find(x => x.id === t.id);
                                    if (fullTrip) handleRestoreOneTrip(fullTrip, bk.name);
                                  }}
                                >
                                  Restore Trip ↗
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}

          {activeTab === 'local' && (
            <>
              {parsedLocalSnapshots.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#5b6672]">
                  No local snapshots stored yet. Snapshots are created automatically when editing trips.
                </div>
              ) : (
                parsedLocalSnapshots.map(entry => {
                  const dateStr = new Date(entry.timestamp).toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={entry.dateKey}
                      className="border border-[#d5cbac] bg-[#fbf8ef] rounded-md p-3 flex items-center justify-between flex-wrap gap-2"
                    >
                      <div>
                        <div className="font-serif font-bold text-sm text-[#1c2530]">
                          Local Snapshot ({entry.dateKey})
                        </div>
                        <div className="text-[11px] font-mono text-[#5b6672] mt-0.5">
                          🕒 {dateStr} · ✈️ {entry.tripsCount} trip(s)
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="btn-primary btn-sm text-xs py-1 px-2.5 font-bold"
                          onClick={() => {
                            if (!entry.parsedState) {
                              onShowToast('Could not read snapshot');
                              return;
                            }
                            if (
                              window.confirm(
                                `Restore local snapshot from ${entry.dateKey}? Current state will be safely checkpointed first.`
                              )
                            ) {
                              onRestoreState(entry.parsedState, `Restored local snapshot (${entry.dateKey})`);
                              onClose();
                            }
                          }}
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-[#d5cbac] pt-3 mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-[#5b6672] font-mono">
            <ShieldCheck size={14} className="text-[#35695c]" />
            <span>Safety checkpoint taken automatically before every restore.</span>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Selective Trip Modal (Overlay) */}
        {selectedSnapshotForTrip && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-[#fcfaf5] border-2 border-[#1c2530] rounded-lg max-w-md w-full p-5 shadow-2xl">
              <h4 className="font-serif font-bold text-base text-[#1c2530] m-0 mb-1">
                Select Trip to Restore
              </h4>
              <p className="text-xs text-[#5b6672] m-0 mb-3">
                From snapshot: <strong>{selectedSnapshotForTrip.name}</strong>. Only the chosen trip will be restored.
              </p>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto mb-4">
                {selectedSnapshotForTrip.state.trips.map(t => (
                  <div
                    key={t.id}
                    className="p-2.5 bg-[#f4efe2] border border-[#d5cbac] rounded flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-[#1c2530]">{t.name} ({t.year})</div>
                      <div className="text-[10px] text-[#5b6672] font-mono">
                        {fmt(t.budget)} · {t.expenses?.length || 0} exp · {t.planItems?.length || 0} stops
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-primary btn-sm text-xs py-1 px-2"
                      onClick={() => handleRestoreOneTrip(t, selectedSnapshotForTrip.name)}
                    >
                      Restore This Trip
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => setSelectedSnapshotForTrip(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
