import React from 'react';
import { APP_VERSION } from '../types';
import { Cloud, CloudCheck, CloudOff, RefreshCw, LogIn, LogOut, Shield } from 'lucide-react';
import { CloudSyncStatus } from '../context/FirebaseContext';
import { User } from 'firebase/auth';

interface HeaderProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  saveFlagVisible: boolean;
  syncStatus: { kind: string; text: string } | null;
  githubConfigured: boolean;
  onGithubPush: () => void;
  onGithubPull: () => void;
  onOpenChangelog: () => void;
  onHomeClick: () => void;
  onOpenCurrencyConverter?: () => void;
  user: User | null;
  cloudSyncStatus: CloudSyncStatus;
  onSignInGoogle: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  saveFlagVisible,
  syncStatus,
  githubConfigured,
  onGithubPush,
  onGithubPull,
  onOpenChangelog,
  onHomeClick,
  onOpenCurrencyConverter,
  user,
  cloudSyncStatus,
  onSignInGoogle,
  onSignOut
}) => {
  return (
    <div className="masthead border-b-2 border-[#1c2530] pb-3 mb-5">
      <div
        className="wordmark cursor-pointer select-none group"
        onClick={onHomeClick}
        role="button"
        tabIndex={0}
      >
        <span className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-[#1c2530] group-hover:text-[#37455a] transition-colors">
          ✈ Travel Ledger
        </span>
        <small className="block font-mono text-[10.5px] uppercase tracking-[3px] text-[#8a7a3a] mt-0.5 font-semibold">
          Heritage Itinerary, Budget &amp; Manifest
        </small>
      </div>

      <div className="masthead-meta flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2">
          {/* Cloud Persistence Badge & Auth Button */}
          {user ? (
            <div className="flex items-center gap-2 bg-[#f4efe2] border border-[#d5cbac] px-2 py-1 rounded text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-[#35695c] animate-pulse" title="Connected to Cloud Firestore" />
              <span className="text-[#1c2530] font-medium max-w-[140px] truncate" title={user.email || 'Cloud User'}>
                {user.displayName || user.email?.split('@')[0] || 'Explorer'}
              </span>
              <button
                onClick={onSignOut}
                className="text-[10px] uppercase text-[#a63a2e] hover:underline ml-1 font-semibold"
                title="Sign out of Cloud sync"
              >
                Exit
              </button>
            </div>
          ) : (
            <button
              onClick={onSignInGoogle}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-semibold uppercase tracking-wider bg-[#1c2530] text-[#f4efe2] rounded hover:bg-[#37455a] transition-colors shadow-xs"
              title="Sign in with Google to enable instant Cloud Firestore backup & multi-device sync"
            >
              <Cloud size={12} className="text-[#b8874f]" /> Cloud Sync
            </button>
          )}

          {/* Undo / Redo */}
          <div className="undo-redo-row flex gap-1">
            <button
              className="undo-redo-btn px-2 py-1 text-xs font-mono bg-[#f4efe2] border border-[#d5cbac] rounded hover:bg-[#eae4d3] disabled:opacity-40"
              disabled={!canUndo}
              onClick={onUndo}
              title="Undo (Ctrl+Z)"
            >
              ↶
            </button>
            <button
              className="undo-redo-btn px-2 py-1 text-xs font-mono bg-[#f4efe2] border border-[#d5cbac] rounded hover:bg-[#eae4d3] disabled:opacity-40"
              disabled={!canRedo}
              onClick={onRedo}
              title="Redo (Ctrl+Shift+Z)"
            >
              ↷
            </button>
          </div>

          {onOpenCurrencyConverter && (
            <button
              type="button"
              onClick={onOpenCurrencyConverter}
              className="px-2 py-1 text-xs font-mono bg-[#f4efe2] border border-[#d5cbac] rounded hover:bg-[#eae4d3] text-[#1c2530] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              title="Open Currency Converter & Calculator"
            >
              💱 <span className="hidden sm:inline">Currency</span>
            </button>
          )}

          {/* Version badge */}
          <div
            className="version-badge px-2 py-1 text-[10px] font-mono uppercase tracking-wider bg-[#eae4d3] border border-[#c7bb98] text-[#1c2530] rounded cursor-pointer hover:bg-[#d5cbac] font-bold transition-colors"
            onClick={onOpenChangelog}
            title="Click to view release history and changelog"
          >
            v{APP_VERSION}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Cloud Sync State text */}
          <div className="text-[10.5px] font-mono flex items-center gap-1">
            {cloudSyncStatus === 'synced' && (
              <span className="text-[#35695c] font-semibold">● Cloud Protected</span>
            )}
            {cloudSyncStatus === 'syncing' && (
              <span className="text-[#b8874f] font-semibold">● Syncing Cloud...</span>
            )}
            {cloudSyncStatus === 'local_only' && (
              <span className="text-[#8a7a3a]">● Local Cache Active</span>
            )}
            {cloudSyncStatus === 'offline' && (
              <span className="text-[#5b6672]">● Offline Mode</span>
            )}
            {cloudSyncStatus === 'error' && (
              <span className="text-[#a63a2e]">● Sync Error</span>
            )}
          </div>

          <div className={`save-flag ${saveFlagVisible ? 'show' : ''} text-[10.5px] font-mono text-[#35695c]`}>
            ● saved
          </div>
        </div>

        {syncStatus && (
          <div className={`sync-flag ${syncStatus.kind} text-[10.5px] font-mono`}>
            {syncStatus.text}
          </div>
        )}

        {githubConfigured && (
          <div className="sync-actions mt-1">
            <button
              className="sync-action-btn"
              onClick={onGithubPush}
              title="Write this browser's ledger to GitHub"
            >
              ↑ Push
            </button>
            <button
              className="sync-action-btn"
              onClick={onGithubPull}
              title="Replace this browser's ledger with the GitHub copy"
            >
              ↓ Pull
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
