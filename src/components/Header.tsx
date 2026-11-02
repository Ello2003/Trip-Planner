import React, { useState } from 'react';
import { APP_VERSION } from '../types';
import {
  Cloud,
  CloudCheck,
  CloudOff,
  RefreshCw,
  LogIn,
  LogOut,
  ShieldCheck,
  Settings as SettingsIcon,
  Coins,
  Undo2,
  Redo2,
  GitBranch,
  ArrowUp,
  ArrowDown,
  User as UserIcon,
  CheckCircle2
} from 'lucide-react';
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
  onOpenSettings?: () => void;
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
  onOpenSettings,
  user,
  cloudSyncStatus,
  onSignInGoogle,
  onSignOut
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getSyncLabel = () => {
    switch (cloudSyncStatus) {
      case 'synced':
        return { text: 'Cloud Protected', color: '#15803d', dot: 'bg-emerald-500' };
      case 'syncing':
        return { text: 'Syncing Cloud…', color: '#b8874f', dot: 'bg-amber-500 animate-pulse' };
      case 'offline':
        return { text: 'Offline Mode', color: '#5b6672', dot: 'bg-slate-400' };
      case 'error':
        return { text: 'Sync Error', color: '#a63a2e', dot: 'bg-rose-500' };
      default:
        return { text: 'Local Cache Active', color: '#8a7a3a', dot: 'bg-amber-600' };
    }
  };

  const syncInfo = getSyncLabel();

  return (
    <header className="border-b-2 border-[#1c2530] pb-3 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand Wordmark */}
        <div
          className="wordmark cursor-pointer select-none group inline-block"
          onClick={onHomeClick}
          role="button"
          tabIndex={0}
          title="Return to Trip Planner Dashboard"
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-[#1c2530] group-hover:text-[#37455a] transition-colors">
              ✈ Trip Planner
            </span>
          </div>
          <small className="block font-mono text-[10px] uppercase tracking-[2.5px] text-[#8a7a3a] mt-0.5 font-semibold">
            Heritage Itinerary, Budget &amp; Travel Ledger
          </small>
        </div>

        {/* Organized Top Right Control Deck */}
        <div className="flex flex-col items-start md:items-end gap-2">
          {/* Main Controls Row */}
          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
            {/* 1. Account / Cloud Sync Hub */}
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono bg-[#f4efe2] border border-[#d5cbac] hover:border-[#b8874f] rounded-md transition-all shadow-2xs text-[#1c2530] group"
                  title={`Logged in as ${user.email}`}
                >
                  <span className={`w-2 h-2 rounded-full ${syncInfo.dot}`} />
                  <span className="font-semibold max-w-[110px] sm:max-w-[140px] truncate">
                    {user.displayName || user.email?.split('@')[0] || 'Traveler'}
                  </span>
                  <span className="text-[10px] text-[#8a7a3a]">▼</span>
                </button>

                {showUserMenu && (
                  <div
                    className="absolute right-0 top-full mt-1.5 w-60 bg-[#fcfaf5] border-2 border-[#1c2530] rounded-lg shadow-xl z-50 p-3 text-xs animate-in fade-in"
                    onMouseLeave={() => setShowUserMenu(false)}
                  >
                    <div className="border-b border-[#e2d8bd] pb-2 mb-2">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-[#5b6672]">Cloud Profile</div>
                      <div className="font-semibold text-[#1c2530] truncate">{user.displayName || 'Travel Explorer'}</div>
                      <div className="text-[11px] font-mono text-[#5b6672] truncate">{user.email}</div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-[#35695c] mb-3">
                      <ShieldCheck size={14} />
                      <span>{syncInfo.text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onSignOut();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-[#f4efe2] hover:bg-[#eae4d3] border border-[#d5cbac] text-[#a63a2e] font-mono font-semibold rounded text-[11px] transition-colors"
                    >
                      <LogOut size={12} /> Sign Out of Cloud
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onSignInGoogle}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold uppercase tracking-wider bg-[#1c2530] text-[#f4efe2] rounded-md hover:bg-[#37455a] transition-all shadow-xs cursor-pointer"
                title="Sign in with Google to enable automatic Cloud Firestore backup & multi-device sync"
              >
                <Cloud size={13} className="text-[#b8874f]" />
                <span>Cloud Login</span>
              </button>
            )}

            {/* 2. GitHub Push/Pull Group (if configured) */}
            {githubConfigured && (
              <div className="inline-flex items-center bg-[#f4efe2] border border-[#d5cbac] rounded-md p-0.5 shadow-2xs font-mono text-xs">
                <span className="px-2 py-0.5 text-[10px] text-[#5b6672] font-semibold flex items-center gap-1 border-r border-[#d5cbac]">
                  <GitBranch size={11} className="text-[#8a7a3a]" />
                  <span className="hidden lg:inline">Git</span>
                </span>
                <button
                  type="button"
                  onClick={onGithubPush}
                  className="px-2 py-1 text-[11px] text-[#1c2530] hover:bg-[#eae4d3] rounded font-semibold flex items-center gap-0.5 transition-colors cursor-pointer"
                  title="Push local ledger to GitHub repository"
                >
                  <ArrowUp size={11} className="text-[#35695c]" />
                  <span>Push</span>
                </button>
                <button
                  type="button"
                  onClick={onGithubPull}
                  className="px-2 py-1 text-[11px] text-[#1c2530] hover:bg-[#eae4d3] rounded font-semibold flex items-center gap-0.5 transition-colors cursor-pointer"
                  title="Pull remote ledger from GitHub repository"
                >
                  <ArrowDown size={11} className="text-[#35597a]" />
                  <span>Pull</span>
                </button>
              </div>
            )}

            {/* 3. Undo / Redo Segmented Control */}
            <div className="inline-flex items-center bg-[#f4efe2] border border-[#d5cbac] rounded-md p-0.5 shadow-2xs font-mono">
              <button
                type="button"
                className="px-2 py-1 text-xs hover:bg-[#eae4d3] text-[#1c2530] rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-default"
                disabled={!canUndo}
                onClick={onUndo}
                title="Undo last action (Ctrl+Z)"
              >
                <Undo2 size={13} />
              </button>
              <div className="w-[1px] h-3.5 bg-[#d5cbac]" />
              <button
                type="button"
                className="px-2 py-1 text-xs hover:bg-[#eae4d3] text-[#1c2530] rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-default"
                disabled={!canRedo}
                onClick={onRedo}
                title="Redo action (Ctrl+Shift+Z)"
              >
                <Redo2 size={13} />
              </button>
            </div>

            {/* 4. Currency Converter */}
            {onOpenCurrencyConverter && (
              <button
                type="button"
                onClick={onOpenCurrencyConverter}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono font-semibold bg-[#f4efe2] border border-[#d5cbac] hover:border-[#b8874f] hover:bg-[#eae4d3] text-[#1c2530] rounded-md transition-all shadow-2xs cursor-pointer"
                title="Open Live Multi-Currency Converter & Calculator"
              >
                <Coins size={13} className="text-[#8a7a3a]" />
                <span>Currency</span>
              </button>
            )}

            {/* 5. Settings Hub */}
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono font-semibold bg-[#f4efe2] border border-[#d5cbac] hover:border-[#b8874f] hover:bg-[#eae4d3] text-[#1c2530] rounded-md transition-all shadow-2xs cursor-pointer"
                title="Configure Badges, Maps, Currencies & Integrations"
              >
                <SettingsIcon size={13} className="text-[#37455a]" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            )}

            {/* 6. Version Badge */}
            <button
              type="button"
              onClick={onOpenChangelog}
              className="px-2 py-1.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-[#eae4d3] border border-[#c7bb98] hover:border-[#b8874f] text-[#1c2530] rounded-md transition-all cursor-pointer shadow-2xs"
              title="Click to view Version History & Release Notes"
            >
              v{APP_VERSION}
            </button>
          </div>

          {/* Sub-bar: Quiet status indicator strip */}
          <div className="flex items-center gap-3 text-[11px] font-mono text-[#5b6672] pr-0.5">
            {/* Cloud Status Text */}
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${syncInfo.dot}`} />
              <span style={{ color: syncInfo.color }} className="font-semibold">
                {syncInfo.text}
              </span>
            </div>

            <span className="text-[#c7bb98]">·</span>

            {/* Local Save Flag */}
            <div className="flex items-center gap-1">
              <span className={`text-[10.5px] transition-opacity duration-300 ${saveFlagVisible ? 'opacity-100 text-[#35695c] font-semibold' : 'opacity-70 text-[#5b6672]'}`}>
                {saveFlagVisible ? '✓ Saved' : 'Auto-saved'}
              </span>
            </div>

            {/* GitHub Sync Status Note (if present) */}
            {syncStatus?.text && (
              <>
                <span className="text-[#c7bb98]">·</span>
                <span className={syncStatus.kind === 'error' ? 'text-[#a63a2e] font-semibold' : 'text-[#8a7a3a]'}>
                  {syncStatus.text}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
