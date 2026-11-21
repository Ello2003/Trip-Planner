/** Shared Places text search for Research / Plan maps. */

export type LatLng = { lat: number; lng: number };

function locToLatLng(loc: any): LatLng | null {
  if (!loc) return null;
  const lat = typeof loc.lat === 'function' ? loc.lat() : Number(loc.lat);
  const lng = typeof loc.lng === 'function' ? loc.lng() : Number(loc.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/** Build several queries so places like "Jerry Cigar Bar" still resolve. */
export function buildPlaceQueries(parts: {
  name?: string | null;
  address?: string | null;
  location?: string | null;
  tripName?: string | null;
  country?: string | null;
}): string[] {
  const name = (parts.name || '').trim();
  const address = (parts.address || parts.location || '').trim();
  const trip = (parts.tripName || '').trim();
  const country = (parts.country || '').trim();
  const out: string[] = [];
  const add = (q: string) => {
    const s = q.replace(/\s+/g, ' ').trim();
    if (s.length > 2 && !out.includes(s)) out.push(s);
  };

  if (name && address) add(`${name}, ${address}`);
  if (name && address && trip) add(`${name}, ${address}, ${trip}`);
  if (name && trip) add(`${name}, ${trip}`);
  if (name && country) add(`${name}, ${country}`);
  if (name && trip && country) add(`${name}, ${trip}, ${country}`);
  if (address && address.length > 5) add(address);
  if (name) add(name);
  return out;
}

/**
 * Try text queries in order against Places API (New).
 * placesLib must be the result of useMapsLibrary('places') with Place available.
 */
export async function searchPlaceLatLng(
  placesLib: { Place: any },
  queries: string[]
): Promise<LatLng | null> {
  if (!placesLib?.Place || !queries.length) return null;

  for (const textQuery of queries) {
    try {
      const { places } = await placesLib.Place.searchByText({
        textQuery,
        fields: ['location', 'displayName', 'formattedAddress']
      });
      if (places && places.length > 0) {
        const coords = locToLatLng(places[0].location);
        if (coords) return coords;
      }
    } catch {
      // try next query
    }
  }
  return null;
}
