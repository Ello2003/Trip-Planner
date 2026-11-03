import React, { useState, useEffect, useRef } from 'react';
import { APP_VERSION } from '../types';
import {
  Cloud,
  LogOut,
  ShieldCheck,
  Settings as SettingsIcon,
  Coins,
  Undo2,
  Redo2,
  ChevronDown
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
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the account menu on outside click or Escape
  useEffect(() => {
    if (!showUserMenu) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowUserMenu(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showUserMenu]);

  const syncInfo = (() => {
    switch (cloudSyncStatus) {
      case 'synced':
        return { text: 'Cloud Protected', color: 'var(--green)', pulse: false };
      case 'syncing':
        return { text: 'Syncing Cloud…', color: 'var(--brass)', pulse: true };
      case 'offline':
        return { text: 'Offline Mode', color: 'var(--slate)', pulse: false };
      case 'error':
        return { text: 'Sync Error', color: 'var(--red)', pulse: false };
      default:
        return { text: 'Local Cache Active', color: 'var(--ochre)', pulse: false };
    }
  })();

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Traveler';

  return (
    <header className="app-header">
      {/* Brand */}
      <div
        className="wordmark"
        onClick={onHomeClick}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onHomeClick()}
        role="button"
        tabIndex={0}
        title="Return to Trip Planner Dashboard"
      >
        <div className="wordmark-title">✈ Trip Planner</div>
        <small>Heritage Itinerary, Budget &amp; Travel Ledger</small>
      </div>

      <div className="hdr-deck">
        <div className="hdr-row">
          {/* Account */}
          {user ? (
            <div className="hdr-menu-wrap" ref={menuRef}>
              <button
                type="button"
                className="hdr-btn"
                onClick={() => setShowUserMenu(v => !v)}
                aria-haspopup="menu"
                aria-expanded={showUserMenu}
                title={`Signed in as ${user.email}`}
              >
                <span className="hdr-avatar">{displayName.charAt(0).toUpperCase()}</span>
                <span className="hdr-name">{displayName}</span>
                <ChevronDown size={13} className="ico-ochre" />
              </button>

              {showUserMenu && (
                <div className="hdr-menu" role="menu">
                  <div className="hdr-menu-eyebrow">Cloud profile</div>
                  <div className="hdr-menu-name">{user.displayName || 'Travel Explorer'}</div>
                  <div className="hdr-menu-email">{user.email}</div>
                  <div className="hdr-menu-status" style={{ color: syncInfo.color }}>
                    <ShieldCheck size={14} />
                    <span>{syncInfo.text}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--red)' }}
                    onClick={() => {
                      setShowUserMenu(false);
                      onSignOut();
                    }}
                  >
                    <LogOut size={13} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="hdr-btn primary"
              onClick={onSignInGoogle}
              title="Sign in with Google for automatic cloud backup and multi-device sync"
            >
              <Cloud size={14} className="ico-brass" />
              <span>Cloud Login</span>
            </button>
          )}

          {/* Undo / Redo */}
          <div className="hdr-seg" role="group" aria-label="History">
            <button type="button" disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl+Z)" aria-label="Undo">
              <Undo2 size={14} />
            </button>
            <button type="button" disabled={!canRedo} onClick={onRedo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
              <Redo2 size={14} />
            </button>
          </div>

          {onOpenCurrencyConverter && (
            <button type="button" className="hdr-btn" onClick={onOpenCurrencyConverter} title="Currency converter & calculator">
              <Coins size={14} className="ico-ochre" />
              <span>Currency</span>
            </button>
          )}

          <button type="button" className="hdr-btn version" onClick={onOpenChangelog} title="Version history & release notes">
            v{APP_VERSION}
          </button>

          {onOpenSettings && (
            <button type="button" className="hdr-btn settings" onClick={onOpenSettings} title="Settings: preferences, backups, GitHub sync, trash & activity log">
              <SettingsIcon size={14} className="ico-blue" />
              <span>Settings</span>
            </button>
          )}

        </div>

        {/* Status strip */}
        <div className="hdr-status">
          <span className="item">
            <span className={`hdr-dot ${syncInfo.pulse ? 'pulse' : ''}`} style={{ background: syncInfo.color }} />
            <span style={{ color: syncInfo.color, fontWeight: 600 }}>{syncInfo.text}</span>
          </span>
          <span className="sep">·</span>
          <span className={saveFlagVisible ? 'ok' : ''}>{saveFlagVisible ? '✓ Saved' : 'Auto-saved'}</span>
          {syncStatus?.text && (
            <>
              <span className="sep">·</span>
              <span className={syncStatus.kind === 'error' ? 'err' : ''}>{syncStatus.text}</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
