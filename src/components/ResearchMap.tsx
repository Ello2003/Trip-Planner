import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
  useMapsLibrary
} from '@vis.gl/react-google-maps';
import { Trip, ResearchItem, Sheet, Category, Settings } from '../types';
import { fmt } from '../utils/helpers';

interface ResearchMapProps {
  trip: Trip;
  sheets: Sheet[];
  categories?: Category[];
  settings: Settings;
  onOpenMapSettings: () => void;
  onUpdateTrip?: (updated: Trip, logAction?: { action: string; detail: string }) => void;
  onOpenEditResearchModal?: (item: ResearchItem) => void;
  onPromoteToPlan?: (item: ResearchItem) => void;
  onDeleteItem?: (item: ResearchItem) => void;
  onOpenAddResearchModal?: (defaultSheet?: string) => void;
}

interface PlottedResearchItem {
  item: ResearchItem;
  lat: number;
  lng: number;
  source: 'exact' | 'parsed' | 'places' | 'city_fallback';
  sheetColor: string;
}

// Well-known coordinates for popular destinations to seed graceful centers & fallbacks
const KNOWN_DESTINATIONS: Record<string, { lat: number; lng: number }> = {
  london: { lat: 51.5074, lng: -0.1278 },
  paris: { lat: 48.8566, lng: 2.3522 },
  tokyo: { lat: 35.6762, lng: 139.6503 },
  kyoto: { lat: 35.0116, lng: 135.7681 },
  osaka: { lat: 34.6937, lng: 135.5023 },
  rome: { lat: 41.9028, lng: 12.4964 },
  florence: { lat: 43.7696, lng: 11.2558 },
  milan: { lat: 45.4642, lng: 9.1900 },
  venice: { lat: 45.4408, lng: 12.3155 },
  barcelona: { lat: 41.3879, lng: 2.1699 },
  madrid: { lat: 40.4168, lng: -3.7038 },
  lisbon: { lat: 38.7223, lng: -9.1393 },
  amsterdam: { lat: 52.3676, lng: 4.9041 },
  berlin: { lat: 52.5200, lng: 13.4050 },
  vienna: { lat: 48.2082, lng: 16.3738 },
  prague: { lat: 50.0755, lng: 14.4378 },
  dublin: { lat: 53.3498, lng: -6.2603 },
  edinburgh: { lat: 55.9533, lng: -3.1883 },
  newyork: { lat: 40.7128, lng: -74.0060 },
  nyc: { lat: 40.7128, lng: -74.0060 },
  chicago: { lat: 41.8781, lng: -87.6298 },
  losangeles: { lat: 34.0522, lng: -118.2437 },
  sanfrancisco: { lat: 37.7749, lng: -122.4194 },
  singapore: { lat: 1.3521, lng: 103.8198 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  sydney: { lat: -33.8688, lng: 151.2093 },
  melbourne: { lat: -37.8136, lng: 144.9631 },
  hongkong: { lat: 22.3193, lng: 114.1694 },
  bangkok: { lat: 13.7563, lng: 100.5018 },
  istanbul: { lat: 41.0082, lng: 28.9784 },
  reykjavik: { lat: 64.1466, lng: -21.9426 }
};

const PRICE_LABELS: Record<number, string> = { 1: '£', 2: '££', 3: '£££', 4: '££££' };
const PRIORITY_LABELS: Record<number, string> = { 1: '★', 2: '★★', 3: '★★★', 4: '★★★★', 5: '★★★★★' };

// Map Controller for camera pan, zoom, and bounds fitting
const MapController: React.FC<{
  items: PlottedResearchItem[];
  selectedItem: PlottedResearchItem | null;
  triggerFit: number;
}> = ({ items, selectedItem, triggerFit }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || items.length === 0) return;

    if (items.length === 1) {
      map.setCenter({ lat: items[0].lat, lng: items[0].lng });
      map.setZoom(15);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    items.forEach(pt => bounds.extend({ lat: pt.lat, lng: pt.lng }));
    map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
  }, [map, items, triggerFit]);

  useEffect(() => {
    if (!map || !selectedItem) return;
    map.panTo({ lat: selectedItem.lat, lng: selectedItem.lng });
    if ((map.getZoom() || 0) < 14) {
      map.setZoom(15);
    }
  }, [map, selectedItem]);

  return null;
};

// Places dynamic resolver for researched items without stored coordinates
const PlacesResearchResolver: React.FC<{
  tripName: string;
  researchItems: ResearchItem[];
  onResolved: (id: string, coords: { lat: number; lng: number }) => void;
}> = ({ tripName, researchItems, onResolved }) => {
  const placesLib = useMapsLibrary('places');
  const resolvedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!placesLib || !placesLib.Place) return;

    const toResolve = researchItems.filter(item => {
      if (item.lat != null && item.lng != null) return false;
      if (resolvedIdsRef.current.has(item.id)) return false;
      const addr = (item.address || '').trim();
      const name = (item.name || '').trim();
      return addr.length > 2 || name.length > 2;
    });

    if (toResolve.length === 0) return;

    let cancelled = false;
    toResolve.slice(0, 15).forEach((item, index) => {
      setTimeout(async () => {
        if (cancelled) return;
        resolvedIdsRef.current.add(item.id);

        const query = item.address && item.address.trim().length > 2
          ? `${item.name}, ${item.address}, ${tripName}`
          : `${item.name}, ${tripName}`;

        try {
          const { places } = await placesLib.Place.searchByText({
            textQuery: query,
            fields: ['location', 'displayName', 'formattedAddress']
          });

          if (places && places.length > 0 && places[0].location) {
            const loc: any = places[0].location;
            const lat = typeof loc.lat === 'function' ? loc.lat() : Number(loc.lat);
            const lng = typeof loc.lng === 'function' ? loc.lng() : Number(loc.lng);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              onResolved(item.id, { lat, lng });
            }
          }
        } catch {
          // Ignore lookup failures silently
        }
      }, index * 250);
    });

    return () => {
      cancelled = true;
    };
  }, [placesLib, researchItems, tripName, onResolved]);

  return null;
};

export const ResearchMap: React.FC<ResearchMapProps> = ({
  trip,
  sheets,
  settings,
  onOpenMapSettings,
  onUpdateTrip,
  onOpenEditResearchModal,
  onPromoteToPlan,
  onDeleteItem,
  onOpenAddResearchModal
}) => {
  const [selectedSheet, setSelectedSheet] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<PlottedResearchItem | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [fitCounter, setFitCounter] = useState<number>(0);
  const [mapType, setMapType] = useState<string>('roadmap');
  const [dynamicCoords, setDynamicCoords] = useState<Record<string, { lat: number; lng: number }>>({});

  const effectiveApiKey =
    (settings.mapsApiKey && settings.mapsApiKey.trim()) ||
    ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string) ||
    'AIzaSyDfTzJ7tBx6hSWdH0Rr3gKReY82MnT-O6w';

  // Base city center for this trip
  const defaultCenter = useMemo<{ lat: number; lng: number }>(() => {
    const rawName = (trip.name || '').toLowerCase().replace(/[^a-z]/g, '');
    const rawCountry = (trip.country || '').toLowerCase().replace(/[^a-z]/g, '');

    for (const [key, coords] of Object.entries(KNOWN_DESTINATIONS)) {
      if (rawName.includes(key) || rawCountry.includes(key)) {
        return coords;
      }
    }
    return { lat: 51.5074, lng: -0.1278 };
  }, [trip.name, trip.country]);

  // Lookup map for sheet color
  const sheetColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    sheets.forEach(s => {
      map[s.key] = s.color;
    });
    return map;
  }, [sheets]);

  const handleCoordResolved = useCallback((id: string, coords: { lat: number; lng: number }) => {
    setDynamicCoords(prev => ({ ...prev, [id]: coords }));
  }, []);

  // Compute all plotted research items
  const plottedItems = useMemo<PlottedResearchItem[]>(() => {
    const result: PlottedResearchItem[] = [];

    (trip.research || []).forEach((item, index) => {
      let lat: number | null = null;
      let lng: number | null = null;
      let source: PlottedResearchItem['source'] = 'city_fallback';

      // 1. Explicit lat/lng already stored
      if (item.lat != null && item.lng != null && Number.isFinite(item.lat) && Number.isFinite(item.lng)) {
        lat = item.lat;
        lng = item.lng;
        source = 'exact';
      }
      // 2. Dynamic Places API resolved coordinate
      else if (dynamicCoords[item.id]) {
        lat = dynamicCoords[item.id].lat;
        lng = dynamicCoords[item.id].lng;
        source = 'places';
      }
      // 3. Coordinate inside address string
      else if (item.address) {
        const match = item.address.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
        if (match) {
          const parsedLat = parseFloat(match[1]);
          const parsedLng = parseFloat(match[2]);
          if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
            lat = parsedLat;
            lng = parsedLng;
            source = 'parsed';
          }
        }
      }

      // 4. Fallback organic cluster around destination center
      if (lat == null || lng == null) {
        const angle = (index * 137.5 * Math.PI) / 180;
        const radius = 0.007 + ((index % 6) * 0.0035);
        lat = defaultCenter.lat + Math.cos(angle) * radius;
        lng = defaultCenter.lng + Math.sin(angle) * radius * 1.35;
        source = 'city_fallback';
      }

      const color = sheetColorMap[item.sheet] || '#b8874f';

      result.push({
        item,
        lat,
        lng,
        source,
        sheetColor: color
      });
    });

    return result;
  }, [trip.research, dynamicCoords, defaultCenter, sheetColorMap]);

  // Unique categories / sheets with counts
  const sheetStats = useMemo(() => {
    const counts: Record<string, number> = {};
    (trip.research || []).forEach(r => {
      if (r.sheet) {
        counts[r.sheet] = (counts[r.sheet] || 0) + 1;
      }
    });

    const list = sheets
      .filter(s => !trip.hiddenSheets?.includes(s.key))
      .map(s => ({
        key: s.key,
        color: s.color,
        count: counts[s.key] || 0
      }));

    return list;
  }, [trip.research, sheets, trip.hiddenSheets]);

  // Filter items by sheet, status, priority
  const filteredItems = useMemo(() => {
    return plottedItems.filter(p => {
      // Category / Sheet filter
      if (selectedSheet !== 'all' && p.item.sheet !== selectedSheet) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'active') {
          if (p.item.status === 'dismissed') return false;
        } else if (p.item.status !== selectedStatus) {
          return false;
        }
      }
      // Priority filter
      if (selectedPriority !== 'all') {
        const prio = p.item.priority || 0;
        if (selectedPriority === '5' && prio < 5) return false;
        if (selectedPriority === '4+' && prio < 4) return false;
        if (selectedPriority === '3+' && prio < 3) return false;
      }
      return true;
    });
  }, [plottedItems, selectedSheet, selectedStatus, selectedPriority]);

  const handleToggleShortlist = (item: ResearchItem) => {
    if (!onUpdateTrip) return;
    const newStatus = item.status === 'shortlisted' ? 'researching' : 'shortlisted';
    const updated = (trip.research || []).map(r =>
      r.id === item.id ? { ...r, status: newStatus as any } : r
    );
    onUpdateTrip(
      {
        ...trip,
        research: updated,
        updatedAt: Date.now()
      },
      {
        action: newStatus === 'shortlisted' ? 'research-shortlisted' : 'research-unshortlisted',
        detail: `${newStatus === 'shortlisted' ? 'Shortlisted' : 'Unshortlisted'} "${item.name}" on ${trip.name}`
      }
    );
  };

  if (!effectiveApiKey) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center', margin: '14px 0' }}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>🗺️</div>
        <h3 style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)' }}>Researched Places Map</h3>
        <p style={{ color: 'var(--ink-soft)', fontSize: '13px', maxWidth: '440px', margin: '0 auto 16px' }}>
          Connect a Google Maps Platform API key in Settings to view all your researched hotels, restaurants, sights, and hidden gems plotted on an interactive map with category badges.
        </p>
        <button className="btn-primary" onClick={onOpenMapSettings}>
          Configure Google Maps Key
        </button>
      </div>
    );
  }

  return (
    <div
      className="chart-card"
      style={{
        padding: 0,
        overflow: 'hidden',
        border: '1px solid var(--paper-edge)',
        borderRadius: '8px',
        background: 'var(--paper-raised)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        marginBottom: '18px'
      }}
    >
      {/* Top Map Header & Controls */}
      <div
        style={{
          padding: '10px 16px',
          background: 'var(--paper-raised)',
          borderBottom: '1px solid var(--paper-edge)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🗺️</span> Researched Places Map
          </h3>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              background: 'var(--paper)',
              padding: '2px 8px',
              borderRadius: '12px',
              border: '1px solid var(--line)',
              color: 'var(--ink-soft)'
            }}
          >
            {filteredItems.length} place{filteredItems.length !== 1 ? 's' : ''} plotted
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {onOpenAddResearchModal && (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => onOpenAddResearchModal(selectedSheet !== 'all' ? selectedSheet : undefined)}
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              + Add Place
            </button>
          )}

          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setFitCounter(c => c + 1)}
            title="Recenter and fit all markers"
            style={{ fontSize: '12px', padding: '4px 10px' }}
          >
            Fit Bounds
          </button>

          <select
            value={mapType}
            onChange={e => setMapType(e.target.value)}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              background: 'var(--paper)',
              borderColor: 'var(--paper-edge)',
              color: 'var(--ink)',
              borderRadius: '4px'
            }}
          >
            <option value="roadmap">Roadmap</option>
            <option value="terrain">Terrain</option>
            <option value="hybrid">Satellite</option>
          </select>

          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Compact map view' : 'Expand map view'}
            style={{ fontSize: '12px', padding: '4px 10px' }}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>

          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={onOpenMapSettings}
            title="Map key & settings"
            style={{ fontSize: '12px', padding: '4px 8px' }}
          >
            ⚙️ Key
          </button>
        </div>
      </div>

      {/* Category / Sheet Filters Bar */}
      <div
        style={{
          padding: '8px 16px',
          background: 'var(--paper)',
          borderBottom: '1px solid var(--paper-edge)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          fontSize: '12px'
        }}
      >
        <span
          style={{
            fontSize: '11px',
            color: 'var(--ink-soft)',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            whiteSpace: 'nowrap'
          }}
        >
          Categories:
        </span>

        {/* All Categories Pill */}
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => setSelectedSheet('all')}
          style={{
            padding: '3px 10px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            background: selectedSheet === 'all' ? 'var(--ink)' : 'transparent',
            color: selectedSheet === 'all' ? '#fff' : 'inherit',
            fontWeight: selectedSheet === 'all' ? 600 : 400
          }}
        >
          All Categories ({trip.research?.length || 0})
        </button>

        {/* Sheet / Category Filter Pills */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {sheetStats.map(s => {
            const active = selectedSheet === s.key;
            return (
              <button
                key={s.key}
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => setSelectedSheet(s.key)}
                style={{
                  padding: '3px 9px',
                  fontSize: '11px',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  borderLeft: `3px solid ${s.color}`,
                  background: active ? 'var(--paper-raised)' : 'transparent',
                  fontWeight: active ? 600 : 400,
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: s.color,
                    display: 'inline-block'
                  }}
                />
                <span>{s.key}</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    color: active ? 'var(--ink)' : 'var(--ink-soft)',
                    opacity: 0.85
                  }}
                >
                  ({s.count})
                </span>
              </button>
            );
          })}
        </div>

        <span style={{ color: 'var(--line)', margin: '0 4px' }}>|</span>

        {/* Status Filter */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setSelectedStatus('all')}
            style={{
              padding: '2px 7px',
              fontSize: '10.5px',
              background: selectedStatus === 'all' ? 'var(--brass)' : 'transparent',
              color: selectedStatus === 'all' ? '#fff' : 'inherit'
            }}
          >
            All Status
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setSelectedStatus('shortlisted')}
            style={{
              padding: '2px 7px',
              fontSize: '10.5px',
              background: selectedStatus === 'shortlisted' ? 'var(--brass)' : 'transparent',
              color: selectedStatus === 'shortlisted' ? '#fff' : 'inherit'
            }}
          >
            ⭐ Shortlisted
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setSelectedStatus('researching')}
            style={{
              padding: '2px 7px',
              fontSize: '10.5px',
              background: selectedStatus === 'researching' ? 'var(--brass)' : 'transparent',
              color: selectedStatus === 'researching' ? '#fff' : 'inherit'
            }}
          >
            🔍 Researching
          </button>
        </div>

        <span style={{ color: 'var(--line)', margin: '0 4px' }}>|</span>

        {/* Priority Filter */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setSelectedPriority('all')}
            style={{
              padding: '2px 7px',
              fontSize: '10.5px',
              background: selectedPriority === 'all' ? 'var(--line)' : 'transparent'
            }}
          >
            All Ratings
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setSelectedPriority('5')}
            style={{
              padding: '2px 7px',
              fontSize: '10.5px',
              background: selectedPriority === '5' ? 'var(--line)' : 'transparent',
              color: selectedPriority === '5' ? 'var(--rust)' : 'inherit',
              fontWeight: selectedPriority === '5' ? 600 : 400
            }}
          >
            ★★★★★
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setSelectedPriority('4+')}
            style={{
              padding: '2px 7px',
              fontSize: '10.5px',
              background: selectedPriority === '4+' ? 'var(--line)' : 'transparent'
            }}
          >
            ★★★★+
          </button>
        </div>
      </div>

      {/* Map Viewport Area */}
      <div style={{ position: 'relative', width: '100%', height: isExpanded ? '580px' : '410px' }}>
        <APIProvider apiKey={effectiveApiKey} libraries={['marker', 'places']}>
          <Map
            mapId="DEMO_MAP_ID"
            defaultCenter={defaultCenter}
            defaultZoom={13}
            mapTypeId={mapType}
            gestureHandling="greedy"
            disableDefaultUI={false}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            {/* Camera Controller */}
            <MapController
              items={filteredItems}
              selectedItem={selectedItem}
              triggerFit={fitCounter}
            />

            {/* Places Resolver for automatic geocoding of research addresses */}
            <PlacesResearchResolver
              tripName={trip.name}
              researchItems={trip.research || []}
              onResolved={handleCoordResolved}
            />

            {/* Advanced Markers for Researched Places */}
            {filteredItems.map(plotted => {
              const { item, lat, lng, sheetColor } = plotted;
              const isSelected = selectedItem?.item.id === item.id;
              const isShortlisted = item.status === 'shortlisted';
              const isPromoted = item.status === 'promoted';

              return (
                <AdvancedMarker
                  key={item.id}
                  position={{ lat, lng }}
                  onClick={() => setSelectedItem(plotted)}
                  title={`${item.name} (${item.sheet})`}
                  zIndex={isSelected ? 99 : isShortlisted ? 30 : 20}
                >
                  <Pin
                    background={sheetColor}
                    borderColor={isSelected ? '#1c2530' : isShortlisted ? '#d4af37' : '#ffffff'}
                    glyphColor="#ffffff"
                    scale={isSelected ? 1.3 : isShortlisted ? 1.15 : 1.05}
                  >
                    <span style={{ fontSize: '10px', fontWeight: 'bold' }}>
                      {isPromoted ? '✓' : isShortlisted ? '★' : (item.sheet?.[0] || '•')}
                    </span>
                  </Pin>
                </AdvancedMarker>
              );
            })}

            {/* Anchored InfoWindow for Selected Researched Place */}
            {selectedItem && (
              <InfoWindow
                position={{ lat: selectedItem.lat, lng: selectedItem.lng }}
                onCloseClick={() => setSelectedItem(null)}
                maxWidth={300}
              >
                <div style={{ padding: '4px 2px', fontFamily: 'var(--font-body)', color: '#1c2530' }}>
                  {/* Category & Status Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '6px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        padding: '1.5px 7px',
                        borderRadius: '3px',
                        background: selectedItem.sheetColor,
                        color: '#fff'
                      }}
                    >
                      {selectedItem.item.sheet}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                      {selectedItem.item.priceLevel && (
                        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>
                          {PRICE_LABELS[selectedItem.item.priceLevel] || ''}
                        </span>
                      )}
                      {selectedItem.item.priority && (
                        <span style={{ color: 'var(--rust)', fontWeight: 600 }}>
                          {PRIORITY_LABELS[selectedItem.item.priority] || ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Place Name */}
                  <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                    {selectedItem.item.name}
                  </h4>

                  {/* Address */}
                  {selectedItem.item.address && (
                    <div style={{ fontSize: '12px', color: '#555', marginBottom: '6px', lineHeight: 1.3 }}>
                      📍 {selectedItem.item.address}
                    </div>
                  )}

                  {/* Estimated Cost */}
                  {selectedItem.item.estCost != null && selectedItem.item.estCost > 0 && (
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#35695c', marginBottom: '6px' }}>
                      Est. {fmt(selectedItem.item.estCost)}
                    </div>
                  )}

                  {/* Notes */}
                  {selectedItem.item.notes && (
                    <p style={{ fontSize: '11px', color: '#666', margin: '0 0 8px', fontStyle: 'italic', lineHeight: 1.3 }}>
                      "{selectedItem.item.notes}"
                    </p>
                  )}

                  {/* Links */}
                  {selectedItem.item.links && selectedItem.item.links.length > 0 && (
                    <div style={{ fontSize: '11px', marginBottom: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {selectedItem.item.links.map((link, idx) => (
                        <a
                          key={link.id || idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#35597a', textDecoration: 'underline' }}
                        >
                          {link.label || 'Link ↗'}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Interactive Action Bar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '6px',
                      marginTop: '8px',
                      paddingTop: '6px',
                      borderTop: '1px solid #e5e5e5'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {onPromoteToPlan && (
                        <button
                          type="button"
                          onClick={() => {
                            onPromoteToPlan(selectedItem.item);
                            setSelectedItem(null);
                          }}
                          style={{
                            background: '#1c2530',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '3px 7px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                          title="Add to Itinerary Plan"
                        >
                          ✈️ Promote
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggleShortlist(selectedItem.item)}
                        style={{
                          background: selectedItem.item.status === 'shortlisted' ? '#d4af37' : '#f0ede6',
                          color: selectedItem.item.status === 'shortlisted' ? '#fff' : '#1c2530',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '3px 7px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: 500
                        }}
                        title={selectedItem.item.status === 'shortlisted' ? 'Remove from shortlist' : 'Add to shortlist'}
                      >
                        {selectedItem.item.status === 'shortlisted' ? '★ Saved' : '☆ Shortlist'}
                      </button>

                      {onOpenEditResearchModal && (
                        <button
                          type="button"
                          onClick={() => {
                            onOpenEditResearchModal(selectedItem.item);
                            setSelectedItem(null);
                          }}
                          style={{
                            background: '#f0ede6',
                            color: '#1c2530',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '3px 6px',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                          title="Edit place details"
                        >
                          ✎
                        </button>
                      )}

                      {onDeleteItem && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete "${selectedItem.item.name}" from research?`)) {
                              onDeleteItem(selectedItem.item);
                              setSelectedItem(null);
                            }
                          }}
                          style={{
                            background: 'transparent',
                            color: 'var(--red)',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '3px 5px',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                          title="Delete research item"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        selectedItem.item.address
                          ? `${selectedItem.item.name}, ${selectedItem.item.address}`
                          : `${selectedItem.item.name}, ${trip.name}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '11px', color: '#35597a', textDecoration: 'underline' }}
                    >
                      Maps ↗
                    </a>
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
      </div>

      {/* Quick Place Strip Carousel */}
      {filteredItems.length > 0 && (
        <div
          style={{
            padding: '10px 16px',
            background: 'var(--paper-raised)',
            borderTop: '1px solid var(--paper-edge)',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto'
          }}
        >
          {filteredItems.map(plotted => {
            const isSelected = selectedItem?.item.id === plotted.item.id;
            return (
              <button
                key={plotted.item.id}
                type="button"
                onClick={() => setSelectedItem(plotted)}
                style={{
                  flex: '0 0 auto',
                  background: isSelected ? 'var(--paper)' : 'transparent',
                  border: isSelected ? '1px solid var(--brass)' : '1px solid var(--line)',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: isSelected ? '0 1px 4px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: plotted.sheetColor
                  }}
                />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                    {plotted.item.name}
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                    {plotted.item.sheet}
                    {plotted.item.priceLevel ? ` · ${PRICE_LABELS[plotted.item.priceLevel]}` : ''}
                    {plotted.item.priority ? ` · ${PRIORITY_LABELS[plotted.item.priority]}` : ''}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
