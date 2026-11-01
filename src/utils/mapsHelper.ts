import { Settings } from '../types';

export const PROVISIONED_MAPS_DEMO_KEY = 'AIzaSyDfTzJ7tBx6hSWdH0Rr3gKReY82MnT-O6w';

/**
 * Returns the effective Google Maps API Key prioritizing user custom key,
 * followed by environment variable, followed by the provisioned Cloud Demo Key.
 */
export function getGoogleMapsApiKey(settings?: Settings): string {
  if (settings?.mapsApiKey && settings.mapsApiKey.trim().length > 0) {
    return settings.mapsApiKey.trim();
  }
  const envKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim().length > 0) {
    return envKey.trim();
  }
  return PROVISIONED_MAPS_DEMO_KEY;
}

export interface ResolvedPlace {
  name: string;
  address: string;
  lat: number;
  lng: number;
  website?: string;
  source: 'places_new' | 'geocoder' | 'osm_fallback';
}

let loadPromise: Promise<void> | null = null;

/**
 * Ensures Google Maps JavaScript API is loaded in the browser.
 */
export function ensureGoogleMapsLoaded(apiKey?: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).google?.maps) return Promise.resolve();
  if (loadPromise) return loadPromise;

  const key = apiKey || getGoogleMapsApiKey();
  loadPromise = new Promise<void>((resolve) => {
    const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existing) {
      const check = setInterval(() => {
        if ((window as any).google?.maps) {
          clearInterval(check);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(check);
        resolve();
      }, 4000);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places,marker,geocoding&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      console.warn('Google Maps script failed to load, falling back to network geocoder');
      resolve();
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

/**
 * Searches for places or addresses using Google Maps Platform modern APIs
 * with graceful fallback to standard Geocoding.
 * Never throws unhandled errors or displays legacy popup alerts.
 */
export async function searchPlaceOrAddress(
  query: string,
  apiKey?: string,
  contextHint?: string
): Promise<ResolvedPlace[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery || cleanQuery.length < 2) return [];

  const effectiveKey = apiKey || getGoogleMapsApiKey();
  await ensureGoogleMapsLoaded(effectiveKey);

  const searchQuery = contextHint && !cleanQuery.toLowerCase().includes(contextHint.toLowerCase())
    ? `${cleanQuery}, ${contextHint}`
    : cleanQuery;

  // 1. Try Google Maps JavaScript API (Places API New)
  try {
    const g = (window as any).google;
    if (g?.maps) {
      // Modern Places API (New) Place.searchByText
      let placesLib = g.maps.places;
      if (!placesLib && typeof g.maps.importLibrary === 'function') {
        placesLib = await g.maps.importLibrary('places');
      }

      if (placesLib?.Place?.searchByText) {
        const response = await placesLib.Place.searchByText({
          textQuery: searchQuery,
          fields: ['displayName', 'formattedAddress', 'location', 'websiteURI']
        });

        if (response?.places && response.places.length > 0) {
          return response.places.map((p: any) => {
            const loc = p.location;
            const lat = typeof loc?.lat === 'function' ? loc.lat() : Number(loc?.lat);
            const lng = typeof loc?.lng === 'function' ? loc.lng() : Number(loc?.lng);
            return {
              name: p.displayName || cleanQuery,
              address: p.formattedAddress || p.displayName || cleanQuery,
              lat,
              lng,
              website: p.websiteURI || undefined,
              source: 'places_new'
            };
          }).filter((p: ResolvedPlace) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
        }
      }

      // 2. Try Google Maps Geocoder if places library is not yet loaded or returned empty
      let geocodingLib = g.maps.geocoding;
      if (!geocodingLib && typeof g.maps.importLibrary === 'function') {
        geocodingLib = await g.maps.importLibrary('geocoding');
      }

      const GeocoderClass = g.maps.Geocoder || geocodingLib?.Geocoder;
      if (GeocoderClass) {
        const geocoder = new GeocoderClass();
        const geoResult = await new Promise<any[]>((resolve) => {
          geocoder.geocode({ address: searchQuery }, (results: any, status: any) => {
            if (status === 'OK' && Array.isArray(results) && results.length > 0) {
              resolve(results);
            } else {
              resolve([]);
            }
          });
        });

        if (geoResult.length > 0) {
          return geoResult.map((res: any) => {
            const loc = res.geometry?.location;
            const lat = typeof loc?.lat === 'function' ? loc.lat() : Number(loc?.lat);
            const lng = typeof loc?.lng === 'function' ? loc.lng() : Number(loc?.lng);
            return {
              name: res.formatted_address?.split(',')[0] || cleanQuery,
              address: res.formatted_address || cleanQuery,
              lat,
              lng,
              source: 'geocoder' as const
            };
          }).filter((p: ResolvedPlace) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
        }
      }
    }
  } catch (err) {
    console.debug('Google Maps client geocode error, attempting network fallback:', err);
  }

  // 3. Robust OpenStreetMap Nominatim fallback to guarantee address and coordinate resolution
  try {
    const encoded = encodeURIComponent(searchQuery);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=5&addressdetails=1`, {
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => ({
          name: item.name || item.display_name?.split(',')[0] || cleanQuery,
          address: item.display_name || cleanQuery,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          source: 'osm_fallback' as const
        })).filter((p: ResolvedPlace) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
      }
    }
  } catch (err) {
    console.debug('Geocoding fallback request failed:', err);
  }

  return [];
}
