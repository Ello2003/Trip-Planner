from pathlib import Path
import base64
import urllib.request

# Prefer fetching known-good from GitHub history (no size limits on runner)
url = 'https://raw.githubusercontent.com/Ello2003/Trip-Planner/906e07e9/src/components/TripDetailView.tsx'
try:
    data = urllib.request.urlopen(url, timeout=30).read()
    Path('src/components/TripDetailView.tsx').write_bytes(data)
    print('fetched', len(data))
except Exception as e:
    print('fetch failed', e)
    # fallback concat local parts if present
    a = Path('scripts/td_a.b64')
    b = Path('scripts/td_b.b64')
    if a.exists() and b.exists():
        raw = base64.b64decode(a.read_text().strip() + b.read_text().strip())
        Path('src/components/TripDetailView.tsx').write_bytes(raw)
        print('from parts', len(raw))
    else:
        raise

t = Path('src/components/TripDetailView.tsx').read_text()
if 'onQuickPromoteToPlan' not in t:
    t = t.replace(
        '  onPromoteToPlan: (item: ResearchItem) => void;',
        '  onPromoteToPlan: (item: ResearchItem) => void;\n  onQuickPromoteToPlan?: (item: ResearchItem) => void;',
        1,
    )
    t = t.replace(
        '  onPromoteToPlan,',
        '  onPromoteToPlan,\n  onQuickPromoteToPlan,',
        1,
    )
    t = t.replace(
        '          onPromoteToPlan={onPromoteToPlan}\n',
        '          onPromoteToPlan={onPromoteToPlan}\n          onQuickPromoteToPlan={onQuickPromoteToPlan}\n',
        1,
    )
    Path('src/components/TripDetailView.tsx').write_text(t)
    print('wired quick promote')
assert 'detail-header' in t or 'detail-header' in Path('src/components/TripDetailView.tsx').read_text()
print('ok size', Path('src/components/TripDetailView.tsx').stat().st_size)
