import React, { useState, useEffect } from 'react';
import { AppState, BackupSnapshot, HistoryEntry, Trip } from '../types';
import { useFirebase } from '../context/FirebaseContext';
import { Download, Trash2, Plus } from 'lucide-react';
import { ModalWrapper } from './Modals';
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


  const formatDate = (ts: number | string) =>
    new Date(ts).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  const triggerStyle = (trigger?: string): React.CSSProperties => {
    const map: Record<string, { bg: string; color: string }> = {
      checkpoint: { bg: 'rgba(184,135,79,0.18)', color: 'var(--ochre)' },
      auto: { bg: 'rgba(53,105,92,0.12)', color: 'var(--green)' },
      manual: { bg: 'var(--line)', color: 'var(--ink-soft)' }
    };
    const c = map[trigger || 'manual'] || map.manual;
    return {
      fontSize: '9.5px',
      fontFamily: 'var(--font-mono)',
      fontWeight: 700,
      letterSpacing: '.6px',
      textTransform: 'uppercase',
      padding: '2px 6px',
      borderRadius: '3px',
      background: c.bg,
      color: c.color
    };
  };

  const cardStyle: React.CSSProperties = {
    padding: '12px 14px',
    background: 'var(--paper)',
    border: '1px solid var(--paper-edge)',
    borderRadius: '6px'
  };

  const metaStyle: React.CSSProperties = {
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--ink-soft)',
    marginTop: '3px'
  };

  const counter = (n: number, active: boolean): React.ReactNode => (
    <span
      style={{
        fontSize: '9.5px',
        fontFamily: 'var(--font-mono)',
        padding: '1px 5px',
        borderRadius: '3px',
        background: active ? 'rgba(184,135,79,0.18)' : 'var(--line)',
        color: active ? 'var(--ochre)' : 'var(--ink-soft)'
      }}
    >
      {n}
    </span>
  );

  const tabs: { id: 'cloud' | 'local'; label: string; count: number }[] = [
    { id: 'cloud', label: '☁️ Cloud Backups', count: cloudBackups.length },
    { id: 'local', label: '💾 Local Snapshots', count: localHistory.length }
  ];

  const tripMini = (t: { name: string; year: any; budget: number; expenseCount: number; planItemCount: number }) => (
    <>
      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)' }}>
        {t.name} ({t.year})
      </div>
      <div style={{ ...metaStyle, fontSize: '10.5px', marginTop: '1px' }}>
        {fmt(t.budget)} · {t.expenseCount} expenses · {t.planItemCount} stops
      </div>
    </>
  );

  return (
    <ModalWrapper title="Backup & Recovery Vault" wide onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Status banner (matches Settings) */}
        <div
          style={{
            padding: '10px 14px',
            background: 'var(--paper)',
            border: `1px solid ${user ? 'var(--green)' : 'var(--brass)'}`,
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)' }}>
              {user ? `☁️ Cloud sync active · ${user.displayName || user.email}` : '💾 Local cache only'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>
              {user
                ? 'Snapshots are stored in Firestore and available on every device.'
                : 'Sign in from the top bar to enable cloud backups across devices.'}
            </div>
          </div>
          {user && !isCreating && (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => setIsCreating(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Plus size={13} /> New Backup
            </button>
          )}
        </div>

        {/* New backup form */}
        {isCreating && (
          <form
            onSubmit={handleCreateBackup}
            style={{ ...cardStyle, background: 'var(--paper-raised)', display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="backup-name">Backup name</label>
              <input
                id="backup-name"
                type="text"
                placeholder="e.g. Before London budget changes"
                value={newBackupName}
                onChange={e => setNewBackupName(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setIsCreating(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary btn-sm" disabled={isSubmitting || !newBackupName.trim()}>
                {isSubmitting ? 'Saving…' : 'Save Backup'}
              </button>
            </div>
          </form>
        )}

        {/* Segmented tabs (same pattern as Settings) */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', gap: '4px', paddingBottom: '2px' }}>
          {tabs.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: active ? 'var(--paper)' : 'transparent',
                  border: '1px solid',
                  borderColor: active ? 'var(--paper-edge) var(--paper-edge) var(--paper)' : 'transparent',
                  borderTop: active ? '2px solid var(--brass)' : '2px solid transparent',
                  borderRadius: '6px 6px 0 0',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: active ? 600 : 500,
                  color: active ? 'var(--ink)' : 'var(--ink-soft)',
                  marginBottom: '-1px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{tab.label}</span>
                {counter(tab.count, active)}
              </button>
            );
          })}
        </div>

        {/* List */}
        <div style={{ maxHeight: '46vh', minHeight: '180px', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activeTab === 'cloud' && (
            <>
              {!user ? (
                <div className="empty-state">Sign in with Google in the top bar to enable cloud backups.</div>
              ) : isLoading ? (
                <div className="empty-state">Loading cloud backups…</div>
              ) : cloudBackups.length === 0 ? (
                <div className="empty-state">No cloud backups yet. Use “New Backup” to take your first snapshot.</div>
              ) : (
                cloudBackups.map(bk => {
                  const isExpanded = expandedId === bk.id;
                  return (
                    <div key={bk.id} style={cardStyle}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: '14px', color: 'var(--ink)' }}>
                              {bk.name}
                            </span>
                            <span style={triggerStyle(bk.trigger)}>{bk.trigger}</span>
                          </div>
                          <div style={metaStyle}>
                            {formatDate(bk.timestamp)} · {bk.tripCount} trip{bk.tripCount !== 1 ? 's' : ''}
                          </div>
                          {bk.changesSummary && (
                            <div style={{ ...metaStyle, fontStyle: 'italic' }}>{bk.changesSummary}</div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn-ghost btn-sm"
                            onClick={() => setExpandedId(isExpanded ? null : bk.id)}
                            title="Preview trips inside this backup"
                          >
                            {isExpanded ? 'Hide' : 'Inspect'}
                          </button>
                          <button
                            type="button"
                            className="btn-ghost btn-sm"
                            onClick={() => setSelectedSnapshotForTrip(bk)}
                            title="Restore a single trip without touching the others"
                          >
                            Restore trip…
                          </button>
                          <button
                            type="button"
                            className="btn-primary btn-sm"
                            onClick={() => handleFullRestore(bk)}
                            title="Restore the entire ledger to this snapshot"
                          >
                            ↺ Full restore
                          </button>
                          <button
                            type="button"
                            className="btn-ghost btn-sm"
                            onClick={() => handleDownloadSnapshot(bk)}
                            title="Download as JSON"
                            aria-label="Download as JSON"
                            style={{ padding: '5px 7px', display: 'flex' }}
                          >
                            <Download size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn-danger btn-sm"
                            onClick={() => handleDeleteCloudBackup(bk.id, bk.name)}
                            title="Delete backup"
                            aria-label="Delete backup"
                            style={{ padding: '5px 7px', display: 'flex' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--paper-edge)' }}>
                          <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: '6px' }}>
                            Trips in this snapshot
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {(bk.tripsSummary || []).map(t => (
                              <div
                                key={t.id}
                                style={{
                                  padding: '8px 10px',
                                  background: 'var(--paper-raised)',
                                  border: '1px solid var(--paper-edge)',
                                  borderRadius: '5px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '10px'
                                }}
                              >
                                <div>{tripMini(t)}</div>
                                <button
                                  type="button"
                                  className="btn-ghost btn-sm"
                                  style={{ whiteSpace: 'nowrap' }}
                                  onClick={() => {
                                    const fullTrip = bk.state.trips.find(x => x.id === t.id);
                                    if (fullTrip) handleRestoreOneTrip(fullTrip, bk.name);
                                  }}
                                >
                                  Restore
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
                <div className="empty-state">No local snapshots yet. One is saved automatically on your first edit each day.</div>
              ) : (
                parsedLocalSnapshots.map(entry => (
                  <div
                    key={entry.dateKey}
                    style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: '14px', color: 'var(--ink)' }}>
                        {entry.dateKey}
                      </div>
                      <div style={metaStyle}>
                        {formatDate(entry.timestamp)} · {entry.tripsCount} trip{entry.tripsCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-primary btn-sm"
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
                      ↺ Restore
                    </button>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* Footer actions (matches Settings) */}
        <div
          style={{
            paddingTop: '12px',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap'
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>
            🛡️ A safety checkpoint is saved automatically before every restore.
          </span>
          <button type="button" className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* Single-trip restore picker */}
      {selectedSnapshotForTrip && (
        <div
          onClick={() => setSelectedSnapshotForTrip(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(28,37,48,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '20px'
          }}
        >
          <div
            className="modal-box"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '440px' }}
          >
            <h3>Restore a single trip</h3>
            <p style={{ fontSize: '12px', color: 'var(--ink-soft)', margin: '-8px 0 12px' }}>
              From <strong>{selectedSnapshotForTrip.name}</strong>. Your other trips stay unchanged.
            </p>
            <div style={{ maxHeight: '45vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedSnapshotForTrip.state.trips.map(t => (
                <div
                  key={t.id}
                  style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}
                >
                  <div>
                    {tripMini({
                      name: t.name,
                      year: t.year,
                      budget: t.budget,
                      expenseCount: t.expenses?.length || 0,
                      planItemCount: t.planItems?.length || 0
                    })}
                  </div>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    style={{ whiteSpace: 'nowrap' }}
                    onClick={() => handleRestoreOneTrip(t, selectedSnapshotForTrip.name)}
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setSelectedSnapshotForTrip(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalWrapper>
  );
};
