from pathlib import Path
import re

NEW_RESEARCH_RESOLVER = r'''
// Places dynamic resolver for researched items without stored coordinates
const PlacesResearchResolver: React.FC<{
  tripName: string;
  country?: string;
  researchItems: ResearchItem[];
  onResolved: (id: string, coords: { lat: number; lng: number }) => void;
}> = ({ tripName, country, researchItems, onResolved }) => {
  const placesLib = useMapsLibrary('places');
  const successIdsRef = useRef<Set<string>>(new Set());
  const failCountRef = useRef<Record<string, number>>({});
  const inflightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!placesLib || !placesLib.Place) return;

    const toResolve = researchItems.filter(item => {
      if (item.lat != null && item.lng != null && Number.isFinite(item.lat) && Number.isFinite(item.lng)) {
        successIdsRef.current.add(item.id);
        return false;
      }
      if (successIdsRef.current.has(item.id)) return false;
      if (inflightRef.current.has(item.id)) return false;
      if ((failCountRef.current[item.id] || 0) >= 4) return false;
      const addr = (item.address || '').trim();
      const name = (item.name || '').trim();
      return addr.length > 1 || name.length > 1;
    });

    if (toResolve.length === 0) return;

    let cancelled = false;
    // Process in larger batches so later items (e.g. Jerry Cigar Bar) still resolve
    toResolve.slice(0, 40).forEach((item, index) => {
      inflightRef.current.add(item.id);
      setTimeout(async () => {
        if (cancelled) {
          inflightRef.current.delete(item.id);
          return;
        }
        const queries = buildPlaceQueries({
          name: item.name,
          address: item.address,
          tripName,
          country
        });
        const coords = await searchPlaceLatLng(placesLib, queries);
        inflightRef.current.delete(item.id);
        if (cancelled) return;
        if (coords) {
          successIdsRef.current.add(item.id);
          onResolved(item.id, coords);
        } else {
          failCountRef.current[item.id] = (failCountRef.current[item.id] || 0) + 1;
        }
      }, index * 200);
    });

    return () => {
      cancelled = true;
    };
  }, [placesLib, researchItems, tripName, country, onResolved]);

  return null;
};
'''

NEW_PLAN_RESOLVER = r'''
const PlacesResolver: React.FC<{
  tripName: string;
  country?: string;
  planItems: PlanItem[];
  onResolved: (id: string, coords: { lat: number; lng: number }) => void;
}> = ({ tripName, country, planItems, onResolved }) => {
  const placesLib = useMapsLibrary('places');
  const successIdsRef = useRef<Set<string>>(new Set());
  const failCountRef = useRef<Record<string, number>>({});
  const inflightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!placesLib || !placesLib.Place) return;

    const toResolve = planItems.filter(item => {
      if (item.lat != null && item.lng != null && Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng))) {
        successIdsRef.current.add(item.id);
        return false;
      }
      if (successIdsRef.current.has(item.id)) return false;
      if (inflightRef.current.has(item.id)) return false;
      if ((failCountRef.current[item.id] || 0) >= 4) return false;
      const loc = (item.location || '').trim();
      const name = (item.name || '').trim();
      return loc.length > 1 || name.length > 1;
    });

    if (toResolve.length === 0) return;

    let cancelled = false;
    toResolve.slice(0, 40).forEach((item, index) => {
      inflightRef.current.add(item.id);
      setTimeout(async () => {
        if (cancelled) {
          inflightRef.current.delete(item.id);
          return;
        }
        const queries = buildPlaceQueries({
          name: item.name,
          location: item.location,
          tripName,
          country
        });
        const coords = await searchPlaceLatLng(placesLib, queries);
        inflightRef.current.delete(item.id);
        if (cancelled) return;
        if (coords) {
          successIdsRef.current.add(item.id);
          onResolved(item.id, coords);
        } else {
          failCountRef.current[item.id] = (failCountRef.current[item.id] || 0) + 1;
        }
      }, index * 200);
    });

    return () => {
      cancelled = true;
    };
  }, [placesLib, planItems, tripName, country, onResolved]);

  return null;
};
'''

# --- ResearchMap ---
rmp = Path('src/components/ResearchMap.tsx')
r = rmp.read_text()
if "from '../utils/geocodePlace'" not in r:
    # add import after other imports - find last import
    m = list(re.finditer(r"^import .+$", r, re.M))
    if m:
        last = m[-1]
        r = r[:last.end()] + "\nimport { buildPlaceQueries, searchPlaceLatLng } from '../utils/geocodePlace';" + r[last.end():]
        print('research import')

# Replace PlacesResearchResolver block
r2, n = re.subn(
    r"// Places dynamic resolver for researched items without stored coordinates\nconst PlacesResearchResolver:[\s\S]*?return null;\n\};",
    NEW_RESEARCH_RESOLVER.strip() + '\n',
    r,
    count=1,
)
if n != 1:
    raise SystemExit(f'research resolver replace failed n={n}')
r = r2
print('research resolver')

# Persist coords on resolve
old_h = '''  const handleCoordResolved = useCallback((id: string, coords: { lat: number; lng: number }) => {
    setDynamicCoords(prev => ({ ...prev, [id]: coords }));
  }, []);'''
new_h = '''  const handleCoordResolved = useCallback((id: string, coords: { lat: number; lng: number }) => {
    setDynamicCoords(prev => ({ ...prev, [id]: coords }));
    // Persist so pins survive reload and Plan can reuse Research coords
    if (onUpdateTrip) {
      const updated = (trip.research || []).map(item =>
        item.id === id && (item.lat == null || item.lng == null)
          ? { ...item, lat: coords.lat, lng: coords.lng }
          : item
      );
      if (updated !== trip.research) {
        onUpdateTrip({ ...trip, research: updated, updatedAt: Date.now() });
      }
    }
  }, [onUpdateTrip, trip]);'''
if old_h in r:
    r = r.replace(old_h, new_h, 1)
    print('research persist')
else:
    print('research persist WARN')

# Pass country into resolver usage
r = r.replace(
    '''            <PlacesResearchResolver
              tripName={trip.name}
              researchItems={trip.research || []}
              onResolved={handleCoordResolved}
            />''',
    '''            <PlacesResearchResolver
              tripName={trip.name}
              country={trip.country}
              researchItems={trip.research || []}
              onResolved={handleCoordResolved}
            />''',
    1,
)
rmp.write_text(r)

# --- TripMap ---
tmp = Path('src/components/TripMap.tsx')
t = tmp.read_text()
if "from '../utils/geocodePlace'" not in t:
    m = list(re.finditer(r"^import .+$", t, re.M))
    if m:
        last = m[-1]
        t = t[:last.end()] + "\nimport { buildPlaceQueries, searchPlaceLatLng } from '../utils/geocodePlace';" + t[last.end():]
        print('plan import')

t2, n = re.subn(
    r"const PlacesResolver: React\.FC<\{[\s\S]*?return null;\n\};",
    NEW_PLAN_RESOLVER.strip() + '\n',
    t,
    count=1,
)
if n != 1:
    raise SystemExit(f'plan resolver replace failed n={n}')
t = t2
print('plan resolver')

# PlanItem lat/lng in plot path - add check after dynamicCoords
old_plot = '''      // 1. Dynamic Places API resolved coordinate
      if (dynamicCoords[item.id]) {
        lat = dynamicCoords[item.id].lat;
        lng = dynamicCoords[item.id].lng;
        source = 'places';
      }
      // 2. Check matching research item'''
new_plot = '''      // 0. Stored coordinates on the plan item
      if (item.lat != null && item.lng != null && Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng))) {
        lat = Number(item.lat);
        lng = Number(item.lng);
        source = 'exact';
      }
      // 1. Dynamic Places API resolved coordinate
      else if (dynamicCoords[item.id]) {
        lat = dynamicCoords[item.id].lat;
        lng = dynamicCoords[item.id].lng;
        source = 'places';
      }
      // 2. Check matching research item'''
if old_plot in t:
    t = t.replace(old_plot, new_plot, 1)
    print('plan plot')
else:
    print('plan plot WARN')

# handleCoordResolved for plan - find and persist
if 'item.lat == null || item.lng == null' not in t:
    old_ph = re.search(
        r"const handleCoordResolved = useCallback\(\(id: string, coords: \{ lat: number; lng: number \}\) => \{\n    setDynamicCoords\(prev => \(\{ \.\.\.prev, \[id\]: coords \}\)\);\n  \}, \[\]\);",
        t,
    )
    if old_ph:
        t = t[:old_ph.start()] + '''const handleCoordResolved = useCallback((id: string, coords: { lat: number; lng: number }) => {
    setDynamicCoords(prev => ({ ...prev, [id]: coords }));
    if (onUpdateTrip) {
      const updated = (trip.planItems || []).map(item =>
        item.id === id && (item.lat == null || item.lng == null)
          ? { ...item, lat: coords.lat, lng: coords.lng }
          : item
      );
      onUpdateTrip({ ...trip, planItems: updated, updatedAt: Date.now() });
    }
  }, [onUpdateTrip, trip]);''' + t[old_ph.end():]
        print('plan persist')
    else:
        print('plan persist WARN')

# Pass country to PlacesResolver JSX
t = re.sub(
    r"<PlacesResolver\n\s*tripName=\{trip\.name\}\n\s*planItems=\{trip\.planItems\}\n\s*onResolved=\{handleCoordResolved\}\n\s*/>",
    '''<PlacesResolver
              tripName={trip.name}
              country={trip.country}
              planItems={trip.planItems}
              onResolved={handleCoordResolved}
            />''',
    t,
    count=1,
)
tmp.write_text(t)

# types - PlanItem lat/lng
tp = Path('src/types.ts')
ty = tp.read_text()
if 'export interface PlanItem' in ty and 'lat?: number | null' not in ty[ty.find('export interface PlanItem'):ty.find('export interface PlanItem')+500]:
    ty = ty.replace(
        "  location: string;\n  links: LinkItem[];",
        "  location: string;\n  /** Resolved map coordinates (Places / manual) */\n  lat?: number | null;\n  lng?: number | null;\n  links: LinkItem[];",
        1,
    )
    tp.write_text(ty)
    print('types')
else:
    print('types already or skip')

print('done')
