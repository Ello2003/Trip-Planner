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
import { Trip, PlanItem, Sheet, Category, Settings } from '../types';
import { formatDateKey, fmt } from '../utils/helpers';

interface TripMapProps {
  trip: Trip;
  sheets: Sheet[];
  categories: Category[];
  settings: Settings;
  onOpenMapSettings: () => void;
  onUpdateTrip?: (updated: Trip, logAction?: { action: string; detail: string }) => void;
  onToggleVisited?: (item: PlanItem) => void;
}

interface PlottedItem {
  item: PlanItem;
  lat: number;
  lng: number;
  source: 'research' | 'parsed' | 'places' | 'city_fallback';
  sheetColor: string;
  dayLabel: string;
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

// Map Controller for fitBounds and camera management
const MapController: React.FC<{
  items: PlottedItem[];
  selectedItem: PlottedItem | null;
  triggerFit: number;
}> = ({ items, selectedItem, triggerFit }) => {
  const map = useMap();

  // Fit bounds whenever items list changes or triggerFit is clicked
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

  // Pan to selected item
  useEffect(() => {
    if (!map || !selectedItem) return;
    map.panTo({ lat: selectedItem.lat, lng: selectedItem.lng });
    if ((map.getZoom() || 0) < 14) {
      map.setZoom(15);
    }
  }, [map, selectedItem]);

  return null;
};

// Places dynamic geocoder that leverages Places API (New) Place class
const PlacesResolver: React.FC<{
  tripName: string;
  planItems: PlanItem[];
  onResolved: (id: string, coords: { lat: number; lng: number }) => void;
}> = ({ tripName, planItems, onResolved }) => {
  const placesLib = useMapsLibrary('places');
  const resolvedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!placesLib || !placesLib.Place) return;

    // Filter items that have a meaningful location and haven't been resolved yet
    const toResolve = planItems.filter(item => {
      if (resolvedIdsRef.current.has(item.id)) return false;
      const loc = (item.location || '').trim();
      const name = (item.name || '').trim();
      return loc.length > 2 || name.length > 2;
    });

    if (toResolve.length === 0) return;

    // Batch resolve gently with small stagger to respect quota
    let cancelled = false;
    toResolve.slice(0, 15).forEach((item, index) => {
      setTimeout(async () => {
        if (cancelled) return;
        resolvedIdsRef.current.add(item.id);

        const query = item.location && item.location.trim().length > 2
          ? `${item.name}, ${item.location}, ${tripName}`
          : `${item.name}, ${tripName}`;

        try {
          // Use modern Places API (New) Place.searchByText
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
        } catch (err) {
          // Fallback silently without throwing unhandled exceptions
          console.debug('Place search query skipped for:', item.name);
        }
      }, index * 250);
    });

    return () => {
      cancelled = true;
    };
  }, [placesLib, planItems, tripName, onResolved]);

  return null;
};

export const TripMap: React.FC<TripMapProps> = ({
  trip,
  sheets,
  categories,
  settings,
  onOpenMapSettings,
  onUpdateTrip,
  onToggleVisited
}) => {
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedSheet, setSelectedSheet] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<PlottedItem | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [fitCounter, setFitCounter] = useState<number>(0);
  const [mapType, setMapType] = useState<string>('roadmap');
  const [dynamicCoords, setDynamicCoords] = useState<Record<string, { lat: number; lng: number }>>({});

  // Determine effective API key
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
    // Default to London center
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

  // Handle dynamic coordinates resolved by Places API
  const handleCoordResolved = useCallback((id: string, coords: { lat: number; lng: number }) => {
    setDynamicCoords(prev => ({ ...prev, [id]: coords }));
  }, []);

  // Compute all plotted plan items
  const plottedItems = useMemo<PlottedItem[]>(() => {
    const result: PlottedItem[] = [];

    // Map of research items for quick lat/lng matching
    const researchMap: Record<string, { lat: number; lng: number }> = {};
    (trip.research || []).forEach(r => {
      if (r.lat != null && r.lng != null && Number.isFinite(r.lat) && Number.isFinite(r.lng)) {
        if (r.linkedPlanItemId) {
          researchMap[`id:${r.linkedPlanItemId}`] = { lat: r.lat, lng: r.lng };
        }
        researchMap[`name:${r.name.trim().toLowerCase()}`] = { lat: r.lat, lng: r.lng };
      }
    });

    trip.planItems.forEach((item, index) => {
      let lat: number | null = null;
      let lng: number | null = null;
      let source: PlottedItem['source'] = 'city_fallback';

      // 1. Dynamic Places API resolved coordinate
      if (dynamicCoords[item.id]) {
        lat = dynamicCoords[item.id].lat;
        lng = dynamicCoords[item.id].lng;
        source = 'places';
      }
      // 2. Check matching research item
      else if (researchMap[`id:${item.id}`]) {
        const c = researchMap[`id:${item.id}`];
        lat = c.lat;
        lng = c.lng;
        source = 'research';
      } else if (researchMap[`name:${item.name.trim().toLowerCase()}`]) {
        const c = researchMap[`name:${item.name.trim().toLowerCase()}`];
        lat = c.lat;
        lng = c.lng;
        source = 'research';
      }

      // 3. Check if location string has explicit lat/lng coords (e.g. "51.5074, -0.1278")
      else if (item.location) {
        const match = item.location.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
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

      // 4. Graceful city fallback with deterministic spread so items are visible and clickable
      if (lat == null || lng == null) {
        // Create an organic cluster around the destination center
        const angle = (index * 137.5 * Math.PI) / 180;
        const radius = 0.008 + ((index % 5) * 0.004);
        lat = defaultCenter.lat + Math.cos(angle) * radius;
        lng = defaultCenter.lng + Math.sin(angle) * radius * 1.4;
        source = 'city_fallback';
      }

      const color = sheetColorMap[item.sheet] || '#b8874f';
      let dayLabel = 'Unscheduled';
      if (trip.timelineMode === 'dates') {
        dayLabel = item.date ? formatDateKey(item.date, { day: 'numeric', month: 'short' }) : 'Unscheduled';
      } else {
        dayLabel = item.dayNumber != null && item.dayNumber > 0 ? `Day ${item.dayNumber}` : 'Unscheduled';
      }

      result.push({
        item,
        lat,
        lng,
        source,
        sheetColor: color,
        dayLabel
      });
    });

    return result;
  }, [trip.planItems, trip.research, trip.timelineMode, dynamicCoords, defaultCenter, sheetColorMap]);

  // Filter items according to user selections
  const filteredItems = useMemo(() => {
    return plottedItems.filter(p => {
      // Day filter
      if (selectedDay !== 'all') {
        if (selectedDay === 'unscheduled') {
          if (trip.timelineMode === 'dates' ? p.item.date != null : p.item.dayNumber != null) {
            return false;
          }
        } else {
          if (trip.timelineMode === 'dates') {
            if (p.item.date !== selectedDay) return false;
          } else {
            if (String(p.item.dayNumber) !== selectedDay) return false;
          }
        }
      }
      // Sheet filter
      if (selectedSheet !== 'all' && p.item.sheet !== selectedSheet) {
        return false;
      }
      return true;
    });
  }, [plottedItems, selectedDay, selectedSheet, trip.timelineMode]);

  // Unique days present in plan
  const availableDays = useMemo(() => {
    const daysSet = new Set<string>();
    let hasUnscheduled = false;
    trip.planItems.forEach(p => {
      if (trip.timelineMode === 'dates') {
        if (p.date) daysSet.add(p.date);
        else hasUnscheduled = true;
      } else {
        if (p.dayNumber != null && p.dayNumber > 0) daysSet.add(String(p.dayNumber));
        else hasUnscheduled = true;
      }
    });

    const sorted = Array.from(daysSet).sort((a, b) => {
      return trip.timelineMode === 'dates' ? a.localeCompare(b) : Number(a) - Number(b);
    });

    return { days: sorted, hasUnscheduled };
  }, [trip.planItems, trip.timelineMode]);

  // Unique sheets present in plan
  const availableSheets = useMemo(() => {
    const set = new Set<string>();
    trip.planItems.forEach(p => {
      if (p.sheet) set.add(p.sheet);
    });
    return Array.from(set);
  }, [trip.planItems]);

  if (!effectiveApiKey) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center', margin: '20px 0' }}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>🗺️</div>
        <h3 style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)' }}>Itinerary Map View</h3>
        <p style={{ color: 'var(--ink-soft)', maxWidth: '460px', margin: '0 auto 16px', fontSize: '13px', lineHeight: 1.5 }}>
          Explore your itinerary, booked stays, and dining stops geographically. Configure your Google Maps API Key to render interactive maps.
        </p>
        <button type="button" className="btn-primary" onClick={onOpenMapSettings}>
          Configure Maps Key
        </button>
      </div>
    );
  }

  return (
    <div
      className="card trip-map-card"
      style={{
        margin: '18px 0',
        padding: '0',
        overflow: 'hidden',
        border: '1px solid var(--paper-edge)',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}
    >
      {/* Map Header Toolbar */}
      <div
        style={{
          padding: '12px 16px',
          background: 'var(--paper-raised)',
          borderBottom: '1px solid var(--paper-edge)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>🗺️</span>
          <span style={{ fontWeight: 600, fontSize: '14px', fontFamily: 'var(--font-display)', letterSpacing: '0.2px' }}>
            Itinerary Route Map
          </span>
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
            {filteredItems.length} stop{filteredItems.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
              color: 'var(--ink)'
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

      {/* Filter Chips Bar */}
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
        <span style={{ fontSize: '11px', color: 'var(--ink-soft)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
          Filter:
        </span>

        {/* Day Selectors */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            type="button"
            className={`btn-ghost btn-sm ${selectedDay === 'all' ? 'active-filter' : ''}`}
            onClick={() => setSelectedDay('all')}
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              background: selectedDay === 'all' ? 'var(--brass)' : 'transparent',
              color: selectedDay === 'all' ? '#fff' : 'inherit'
            }}
          >
            All Days
          </button>
          {availableDays.days.map(d => {
            const label = trip.timelineMode === 'dates' ? formatDateKey(d, { day: 'numeric', month: 'short' }) : `Day ${d}`;
            const active = selectedDay === d;
            return (
              <button
                key={d}
                type="button"
                className={`btn-ghost btn-sm ${active ? 'active-filter' : ''}`}
                onClick={() => setSelectedDay(d)}
                style={{
                  padding: '3px 8px',
                  fontSize: '11px',
                  background: active ? 'var(--brass)' : 'transparent',
                  color: active ? '#fff' : 'inherit'
                }}
              >
                {label}
              </button>
            );
          })}
          {availableDays.hasUnscheduled && (
            <button
              type="button"
              className={`btn-ghost btn-sm ${selectedDay === 'unscheduled' ? 'active-filter' : ''}`}
              onClick={() => setSelectedDay('unscheduled')}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                background: selectedDay === 'unscheduled' ? 'var(--brass)' : 'transparent',
                color: selectedDay === 'unscheduled' ? '#fff' : 'inherit'
              }}
            >
              Unscheduled
            </button>
          )}
        </div>

        <span style={{ color: 'var(--line)', margin: '0 4px' }}>|</span>

        {/* Sheet / Category Selectors */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setSelectedSheet('all')}
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              background: selectedSheet === 'all' ? 'var(--ink)' : 'transparent',
              color: selectedSheet === 'all' ? '#fff' : 'inherit'
            }}
          >
            All Types
          </button>
          {availableSheets.map(shKey => {
            const active = selectedSheet === shKey;
            const color = sheetColorMap[shKey] || '#b8874f';
            return (
              <button
                key={shKey}
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => setSelectedSheet(shKey)}
                style={{
                  padding: '3px 8px',
                  fontSize: '11px',
                  borderLeft: `3px solid ${color}`,
                  background: active ? 'var(--paper-raised)' : 'transparent',
                  fontWeight: active ? 600 : 400
                }}
              >
                {shKey}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Viewport Area */}
      <div style={{ position: 'relative', width: '100%', height: isExpanded ? '580px' : '390px' }}>
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
            {/* Map Camera & Fit Controller */}
            <MapController
              items={filteredItems}
              selectedItem={selectedItem}
              triggerFit={fitCounter}
            />

            {/* Places Resolver for intelligent text-to-coord resolution */}
            <PlacesResolver
              tripName={trip.name}
              planItems={trip.planItems}
              onResolved={handleCoordResolved}
            />

            {/* Render Advanced Markers */}
            {filteredItems.map(plotted => {
              const { item, lat, lng, sheetColor, dayLabel } = plotted;
              const isSelected = selectedItem?.item.id === item.id;
              const isVisited = item.visited;

              return (
                <AdvancedMarker
                  key={item.id}
                  position={{ lat, lng }}
                  onClick={() => setSelectedItem(plotted)}
                  title={`${item.name} (${item.sheet})`}
                  zIndex={isSelected ? 99 : isVisited ? 10 : 20}
                >
                  <Pin
                    background={isVisited ? '#35695c' : sheetColor}
                    borderColor={isSelected ? '#1c2530' : '#ffffff'}
                    glyphColor="#ffffff"
                    scale={isSelected ? 1.3 : 1.05}
                  >
                    <span style={{ fontSize: '10px', fontWeight: 'bold' }}>
                      {isVisited ? '✓' : item.dayNumber != null ? item.dayNumber : '•'}
                    </span>
                  </Pin>
                </AdvancedMarker>
              );
            })}

            {/* Anchored InfoWindow for Selected Stop */}
            {selectedItem && (
              <InfoWindow
                position={{ lat: selectedItem.lat, lng: selectedItem.lng }}
                onCloseClick={() => setSelectedItem(null)}
                maxWidth={280}
              >
                <div style={{ padding: '4px 2px', fontFamily: 'var(--font-body)', color: '#1c2530' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        padding: '1px 6px',
                        borderRadius: '3px',
                        background: selectedItem.sheetColor,
                        color: '#fff'
                      }}
                    >
                      {selectedItem.item.sheet}
                    </span>
                    <span style={{ fontSize: '11px', color: '#666', fontFamily: 'var(--font-mono)' }}>
                      {selectedItem.dayLabel}
                      {selectedItem.item.time ? ` · ${selectedItem.item.time}` : ''}
                    </span>
                  </div>

                  <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontFamily: 'var(--font-display)' }}>
                    {selectedItem.item.name}
                  </h4>

                  {selectedItem.item.location && (
                    <div style={{ fontSize: '12px', color: '#555', marginBottom: '6px', lineHeight: 1.3 }}>
                      📍 {selectedItem.item.location}
                    </div>
                  )}

                  {selectedItem.item.cost != null && (
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#35695c', marginBottom: '6px' }}>
                      Est. {fmt(selectedItem.item.cost)}
                    </div>
                  )}

                  {selectedItem.item.notes && (
                    <p style={{ fontSize: '11px', color: '#666', margin: '0 0 8px', fontStyle: 'italic', lineHeight: 1.3 }}>
                      "{selectedItem.item.notes}"
                    </p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #e5e5e5' }}>
                    {onToggleVisited ? (
                      <button
                        type="button"
                        onClick={() => onToggleVisited(selectedItem.item)}
                        style={{
                          background: selectedItem.item.visited ? '#35695c' : '#f0ede6',
                          color: selectedItem.item.visited ? '#fff' : '#1c2530',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: 500
                        }}
                      >
                        {selectedItem.item.visited ? '✓ Visited' : 'Mark Visited'}
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#888' }}>
                        {selectedItem.item.status}
                      </span>
                    )}

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        selectedItem.item.location
                          ? `${selectedItem.item.name}, ${selectedItem.item.location}`
                          : selectedItem.item.name
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '11px', color: '#35597a', textDecoration: 'underline' }}
                    >
                      Open in Maps ↗
                    </a>
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
      </div>

      {/* Itinerary Quick Carousel / Strip */}
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
                  <div style={{ fontSize: '10px', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                    {plotted.dayLabel} {plotted.item.time ? `· ${plotted.item.time}` : ''}
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
