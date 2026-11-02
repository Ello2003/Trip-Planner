import React, { useState, useMemo } from 'react';
import { APP_VERSION, CHANGELOG } from '../types';
import { ModalWrapper } from './Modals';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ChangeType = 'feature' | 'fix' | 'improvement';

const TYPE_META: Record<ChangeType, { label: string; color: string; bg: string }> = {
  feature: { label: 'New', color: 'var(--green)', bg: 'rgba(53, 105, 92, 0.12)' },
  fix: { label: 'Fix', color: 'var(--red)', bg: 'rgba(166, 58, 46, 0.12)' },
  improvement: { label: 'Improved', color: 'var(--blue)', bg: 'rgba(53, 89, 122, 0.12)' }
};

// Split an unstructured changelog paragraph into individual, classified entries
const parseChangelogItems = (text: string) => {
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/g)
    .map(s => s.trim())
    .filter(Boolean)
    .map((sentence, id) => {
      const lower = sentence.toLowerCase();
      let type: ChangeType = 'improvement';
      if (lower.startsWith('added') || lower.startsWith('introduced') || lower.includes('feature')) {
        type = 'feature';
      } else if (
        lower.startsWith('fixed') ||
        lower.startsWith('resolved') ||
        lower.includes('bug') ||
        lower.includes('error')
      ) {
        type = 'fix';
      }
      return { id, type, text: sentence };
    });
};

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const allVersions = useMemo(
    () => Object.keys(CHANGELOG).sort((a, b) => b.localeCompare(a, undefined, { numeric: true })),
    []
  );

  const filteredVersions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return allVersions;
    return allVersions.filter(
      ver => ver.toLowerCase().includes(term) || (CHANGELOG[ver] || '').toLowerCase().includes(term)
    );
  }, [allVersions, searchTerm]);

  if (!isOpen) return null;

  const pill = (text: string, active = false): React.CSSProperties => ({
    fontSize: '10px',
    fontFamily: 'var(--font-mono)',
    padding: '1px 6px',
    borderRadius: '3px',
    background: active ? 'var(--brass-soft, rgba(184,135,79,0.18))' : 'var(--line)',
    color: active ? 'var(--ochre)' : 'var(--ink-soft)',
    border: '1px solid var(--paper-edge)'
  });

  return (
    <ModalWrapper title="Trip Planner Version History" wide onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Banner (matches Settings) */}
        <div
          style={{
            padding: '10px 14px',
            background: 'var(--paper)',
            border: '1px solid var(--brass)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Release v{APP_VERSION}</span>
              <span
                style={{
                  fontSize: '9.5px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  letterSpacing: '.8px',
                  textTransform: 'uppercase',
                  padding: '2px 7px',
                  borderRadius: '3px',
                  background: 'var(--green)',
                  color: '#fff'
                }}
              >
                Current
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-soft)', marginTop: '2px' }}>
              Running on Google Cloud with a persistent Firestore database.
            </div>
          </div>
          <span style={{ ...pill('', false), fontSize: '11px', padding: '2px 7px', background: 'var(--paper-raised)', color: 'var(--ochre)', whiteSpace: 'nowrap' }}>
            {allVersions.length} releases
          </span>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Search releases (e.g. maps, backup, currency)…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 32px 9px 11px',
              fontSize: '13px',
              border: '1px solid var(--paper-edge)',
              borderRadius: '5px',
              background: '#fff',
              color: 'var(--ink)'
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
              style={{
                position: 'absolute',
                right: '4px',
                top: '50%',
                transform: 'translateY(-50%)',
                border: 'none',
                padding: '4px 8px',
                fontSize: '12px',
                color: 'var(--ink-soft)'
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Release list */}
        <div style={{ maxHeight: '50vh', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredVersions.length === 0 ? (
            <div className="empty-state">No releases match “{searchTerm}”.</div>
          ) : (
            filteredVersions.map(ver => {
              const isCurrent = ver === APP_VERSION;
              const items = parseChangelogItems(CHANGELOG[ver]);
              const isPrevious = !searchTerm && ver === allVersions[1];

              return (
                <div
                  key={ver}
                  style={{
                    background: isCurrent ? 'var(--paper)' : 'var(--paper-raised)',
                    border: `1px solid ${isCurrent ? 'var(--brass)' : 'var(--paper-edge)'}`,
                    borderRadius: '6px',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}
                >
                  <div
                    style={{
                      padding: '9px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid var(--paper-edge)',
                      background: isCurrent ? 'var(--paper)' : 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', color: 'var(--ink)' }}>
                        v{ver}
                      </span>
                      {isCurrent && <span style={pill('', true)}>CURRENT</span>}
                      {isPrevious && <span style={pill('')}>PREVIOUS</span>}
                    </div>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)' }}>
                      {items.length} change{items.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {items.map(item => {
                      const meta = TYPE_META[item.type];
                      return (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <span
                            style={{
                              flex: '0 0 62px',
                              textAlign: 'center',
                              fontSize: '9.5px',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              letterSpacing: '.5px',
                              textTransform: 'uppercase',
                              padding: '2px 0',
                              marginTop: '1px',
                              borderRadius: '3px',
                              color: meta.color,
                              background: meta.bg
                            }}
                          >
                            {meta.label}
                          </span>
                          <span style={{ flex: 1, fontSize: '12.5px', lineHeight: 1.45, color: 'var(--ink-soft)' }}>
                            {item.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Actions */}
        <div
          style={{
            paddingTop: '12px',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)' }}>
            Showing {filteredVersions.length} of {allVersions.length}
          </span>
          <button type="button" className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};
