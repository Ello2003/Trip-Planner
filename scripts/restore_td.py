from pathlib import Path
import base64
# content embedded after write of b64 file
b64 = Path('scripts/td.b64').read_text().strip()
Path('src/components/TripDetailView.tsx').write_bytes(base64.b64decode(b64))
print('restored', len(b64))
