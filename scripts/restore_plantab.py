from pathlib import Path
import urllib.request
url = 'https://raw.githubusercontent.com/Ello2003/Trip-Planner/c41791bf29d2c19556b7458d66ff9ef128ac5366/src/components/PlanTab.tsx'
data = urllib.request.urlopen(url, timeout=30).read()
assert b'export const PlanTab' in data and b'planPriority' in data
Path('src/components/PlanTab.tsx').write_bytes(data)
print('restored', len(data))
