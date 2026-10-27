import React, { useState } from 'react';
import { Trip, Sheet, ResearchItem, Settings, Category } from '../types';
import { fmt, extractMapEmbedUrl } from '../utils/helpers';
import { ResearchMap } from './ResearchMap';

interface ResearchTabProps {
  trip: Trip;
  sheets: Sheet[];
  categories?: Category[];
  settings: Settings;
  onUpdateTrip: (updated: Trip, logAction?: { action: string; detail: string }) => void;
  onOpenAddResearchModal: (defaultSheet?: string) => void;
  onOpenEditResearchModal: (item: ResearchItem) => void;
  onPromoteToPlan: (item: ResearchItem) => void;
  onManageSheets: () => void;
  onOpenMapSettings: () => void;
}

const PRICE_LABELS: Record<number, string> = { 1: '£', 2: '££', 3: '£££', 4: '££££' };
const PRIORITY_LABELS: Record<number, string> = { 1: '★', 2: '★★', 3: '★★★', 4: '★★★★', 5: '★★★★★' };

export const ResearchTab: React.FC<ResearchTabProps> = ({
  trip,
  sheets,
  categories,
  settings,
  onUpdateTrip,
  onOpenAddResearchModal,
  onOpenEditResearchModal,
  onPromoteToPlan,
  onManageSheets,
  onOpenMapSettings
}) => {
  const [researchView, setResearchView] = useState<'both' | 'list' | 'map'>('both');
  const [collapsedSheets, setCollapsedSheets] = useState<Record<string, boolean>>({});
  const [expandedSectionMaps, setExpandedSectionMaps] = useState<Record<string, boolean>>({});
  const [sectionMapEditMode, setSectionMapEditMode] = useState<Record<string, boolean>>({});
  const [sectionMapInputs, setSectionMapInputs] = useState<Record<string, string>>({});

  const toggleSheet = (key: string) => {
    setCollapsedSheets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSectionMap = (key: string) => {
    setExpandedSectionMaps(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveSectionMap = (key: string) => {
    const raw = sectionMapInputs[key] || '';
    const url = extractMapEmbedUrl(raw);
    const updatedUrls = { ...trip.sectionMapUrls, [key]: url };
    onUpdateTrip(
      {
        ...trip,
        sectionMapUrls: updatedUrls,
        updatedAt: Date.now()
      },
      { action: 'section-map-added', detail: `Added a map for ${key} on ${trip.name}` }
    );
    setSectionMapEditMode(prev => ({ ...prev, [key]: false }));
  };

  const handleRemoveSectionMap = (key: string) => {
    const updatedUrls = { ...trip.sectionMapUrls };
    delete updatedUrls[key];
    onUpdateTrip(
      {
        ...trip,
        sectionMapUrls: updatedUrls,
        updatedAt: Date.now()
      },
      { action: 'section-map-removed', detail: `Removed the ${key} map for ${trip.name}` }
    );
    setExpandedSectionMaps(prev => ({ ...prev, [key]: false }));
    setSectionMapEditMode(prev => ({ ...prev, [key]: false }));
  };

  const handleDeleteItem = (item: ResearchItem) => {
    const updated = trip.research.filter(r => r.id !== item.id);
    onUpdateTrip(
      {
        ...trip,
        research: updated,
        updatedAt: Date.now()
      },
      { action: 'research-deleted', detail: `Removed "${item.name}" from ${trip.name} research` }
    );
  };

  return (
    <div>
      <div className="toolbar" style={{ flexWrap: 'wrap', gap: '8px' }}>
        <button className="btn-primary" onClick={() => onOpenAddResearchModal()}>
          + Add Place
        </button>

        <div className="timeline-toggle" style={{ display: 'inline-flex' }}>
          <button
            type="button"
            className={`btn-sm ${researchView === 'both' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setResearchView('both')}
            title="Split view: Interactive Map & Places List"
          >
            🗺️ Split View
          </button>
          <button
            type="button"
            className={`btn-sm ${researchView === 'list' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setResearchView('list')}
            title="Categorized List Only"
          >
            📋 List Only
          </button>
          <button
            type="button"
            className={`btn-sm ${researchView === 'map' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setResearchView('map')}
            title="Interactive Map Only"
          >
            🗺️ Map Only
          </button>
        </div>

        <button className="btn-ghost btn-sm" onClick={onManageSheets} style={{ marginLeft: 'auto' }}>
          Manage Categories
        </button>
        <button className="btn-ghost btn-sm" onClick={onOpenMapSettings}>
          ⚙️ Maps Key
        </button>
      </div>

      {/* Interactive Google Maps component for Researched Places */}
      {(researchView === 'both' || researchView === 'map') && (
        <ResearchMap
          trip={trip}
          sheets={sheets}
          categories={categories}
          settings={settings}
          onOpenMapSettings={onOpenMapSettings}
          onUpdateTrip={onUpdateTrip}
          onOpenEditResearchModal={onOpenEditResearchModal}
          onPromoteToPlan={onPromoteToPlan}
          onDeleteItem={handleDeleteItem}
          onOpenAddResearchModal={onOpenAddResearchModal}
        />
      )}

      {/* Categorized Places List */}
      {researchView !== 'map' && (
        <div>
          {sheets
            .filter(s => !trip.hiddenSheets.includes(s.key))
            .map(s => {
              const items = trip.research.filter(r => r.sheet === s.key);
              const isCollapsed = collapsedSheets[s.key];
              const hasMap = !!trip.sectionMapUrls[s.key];
              const mapExpanded = expandedSectionMaps[s.key];
              const mapEditing = sectionMapEditMode[s.key];

              return (
                <div className={`sheet-section ${items.length ? '' : 'is-empty'}`} key={s.key}>
                  <div className="sheet-header">
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                      onClick={() => toggleSheet(s.key)}
                    >
                      <span>{isCollapsed ? '▸' : '▾'}</span>
                      <span className="sheet-dot" style={{ background: s.color }} />
                      {s.key}{' '}
                      <span style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                        ({items.length})
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn-ghost btn-sm"
                        onClick={() => toggleSectionMap(s.key)}
                        title={hasMap ? 'Show/hide map' : 'Add a map for this section'}
                        style={hasMap ? { borderColor: 'var(--brass)', color: 'var(--brass)' } : undefined}
                      >
                        🗺 Map
                      </button>
                      <button className="btn-ghost btn-sm" onClick={() => onOpenAddResearchModal(s.key)}>
                        + Add
                      </button>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div>
                      {mapExpanded && (
                        <div style={{ marginBottom: '14px' }}>
                          {hasMap && !mapEditing ? (
                            <div>
                              <iframe
                                src={trip.sectionMapUrls[s.key]}
                                width="100%"
                                height="320"
                                style={{ border: 0, borderRadius: '6px', display: 'block' }}
                                loading="lazy"
                                title={`${s.key} Map`}
                              />
                              <div style={{ marginTop: '6px', display: 'flex', gap: '6px' }}>
                                <button
                                  className="btn-ghost btn-sm"
                                  onClick={() => {
                                    setSectionMapInputs(prev => ({ ...prev, [s.key]: trip.sectionMapUrls[s.key] }));
                                    setSectionMapEditMode(prev => ({ ...prev, [s.key]: true }));
                                  }}
                                >
                                  Change
                                </button>
                                <button className="btn-ghost btn-sm" onClick={() => handleRemoveSectionMap(s.key)}>
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                              <textarea
                                rows={1}
                                placeholder="Paste a Google Maps/My Maps share or embed link"
                                style={{ flex: 1 }}
                                value={sectionMapInputs[s.key] || ''}
                                onChange={e =>
                                  setSectionMapInputs(prev => ({ ...prev, [s.key]: e.target.value }))
                                }
                              />
                              <button className="btn-primary btn-sm" onClick={() => handleSaveSectionMap(s.key)}>
                                {hasMap ? 'Save' : 'Add'}
                              </button>
                              {mapEditing && (
                                <button
                                  className="btn-ghost btn-sm"
                                  onClick={() => setSectionMapEditMode(prev => ({ ...prev, [s.key]: false }))}
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {items.length > 0 ? (
                        <div className="table-scroll">
                          <table className="exp-table research-table">
                            <thead>
                              <tr>
                                <th style={{ width: '32%' }}>Name</th>
                                <th style={{ width: '10%' }}>Price</th>
                                <th style={{ width: '12%' }}>Priority</th>
                                <th style={{ width: '14%' }} className="num">Est. Cost</th>
                                <th style={{ width: '12%' }}>Status</th>
                                <th style={{ width: '20%' }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map(r => (
                                <tr key={r.id}>
                                  <td>
                                    <strong>{r.name}</strong>
                                    {r.address && (
                                      <div style={{ color: 'var(--ink-soft)', fontSize: '11px' }}>
                                        {r.address}
                                      </div>
                                    )}
                                    {r.links && r.links.length > 0 && (
                                      <div style={{ fontSize: '11px', marginTop: '2px' }}>
                                        {r.links.map((link, idx) => (
                                          <span key={link.id || idx}>
                                            {idx > 0 && ' · '}
                                            <a
                                              href={link.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              style={{ color: 'var(--blue)' }}
                                            >
                                              {link.label || 'link'}
                                            </a>
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    {r.notes && (
                                      <div style={{ color: 'var(--ink-soft)', fontSize: '11px', fontStyle: 'italic' }}>
                                        {r.notes}
                                      </div>
                                    )}
                                  </td>
                                  <td>{r.priceLevel ? PRICE_LABELS[r.priceLevel] : '—'}</td>
                                  <td>{r.priority ? PRIORITY_LABELS[r.priority] : '—'}</td>
                                  <td className="num">{r.estCost != null ? fmt(r.estCost) : '—'}</td>
                                  <td>
                                    <span
                                      className={`status-chip status-${
                                        r.status === 'promoted'
                                          ? 'completed'
                                          : r.status === 'dismissed'
                                          ? 'cancelled'
                                          : 'upcoming'
                                      }`}
                                    >
                                      {r.status}
                                    </span>
                                  </td>
                                  <td style={{ whiteSpace: 'nowrap' }}>
                                    {r.status !== 'promoted' && (
                                      <button
                                        className="btn-ghost btn-sm"
                                        onClick={() => onPromoteToPlan(r)}
                                        title="Promote to Plan"
                                        style={{ marginRight: '6px' }}
                                      >
                                        → Plan
                                      </button>
                                    )}
                                    <button
                                      className="exp-del"
                                      onClick={() => onOpenEditResearchModal(r)}
                                      title="Edit"
                                    >
                                      ✎
                                    </button>
                                    <button
                                      className="exp-del"
                                      onClick={() => handleDeleteItem(r)}
                                      title="Delete"
                                    >
                                      ✕
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="empty-state">Nothing here yet.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};
