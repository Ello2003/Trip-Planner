#!/usr/bin/env python3
"""Bump APP_VERSION (types.ts), package.json, in-app CHANGELOG, and CHANGELOG.md.

Usage:
  python3 scripts/bump_version.py              # patch +1 (1.25.0 -> 1.25.1)
  python3 scripts/bump_version.py minor        # 1.25.0 -> 1.26.0
  python3 scripts/bump_version.py major        # 1.25.0 -> 2.0.0
  python3 scripts/bump_version.py 1.26.0       # set exact
  python3 scripts/bump_version.py patch "Notes about this release"
"""
from __future__ import annotations

import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TYPES = ROOT / 'src' / 'types.ts'
PKG = ROOT / 'package.json'
CL = ROOT / 'CHANGELOG.md'


def parse_ver(v: str) -> tuple[int, int, int]:
    m = re.match(r'^(\d+)\.(\d+)\.(\d+)$', v.strip())
    if not m:
        raise SystemExit(f'Bad version: {v}')
    return int(m.group(1)), int(m.group(2)), int(m.group(3))


def fmt(v: tuple[int, int, int]) -> str:
    return f'{v[0]}.{v[1]}.{v[2]}'


def read_app_version() -> str:
    t = TYPES.read_text()
    m = re.search(r"export const APP_VERSION = '([^']+)'", t)
    if not m:
        raise SystemExit('APP_VERSION not found')
    return m.group(1)


def bump(kind: str, current: str) -> str:
    if re.match(r'^\d+\.\d+\.\d+$', kind):
        return kind
    major, minor, patch = parse_ver(current)
    if kind == 'major':
        return fmt((major + 1, 0, 0))
    if kind == 'minor':
        return fmt((major, minor + 1, 0))
    # patch default
    return fmt((major, minor, patch + 1))


def main() -> None:
    args = sys.argv[1:]
    kind = 'patch'
    notes = ''
    if args and re.match(r'^\d+\.\d+\.\d+$', args[0]):
        kind = args[0]
        notes = ' '.join(args[1:]).strip()
    elif args and args[0] in ('patch', 'minor', 'major'):
        kind = args[0]
        notes = ' '.join(args[1:]).strip()
    elif args:
        notes = ' '.join(args).strip()

    current = read_app_version()
    new = bump(kind, current)
    if new == current:
        print(f'already {current}')
        return

    if not notes:
        notes = f'Maintenance release {new}.'

    # types.ts APP_VERSION + CHANGELOG entry
    t = TYPES.read_text()
    t, n = re.subn(
        r"export const APP_VERSION = '[^']+';",
        f"export const APP_VERSION = '{new}';",
        t,
        count=1,
    )
    if n != 1:
        raise SystemExit('failed to set APP_VERSION')
    if f"'{new}':" not in t:
        t = t.replace(
            'export const CHANGELOG: Record<string, string> = {\n',
            f"export const CHANGELOG: Record<string, string> = {{\n  '{new}': '{notes.replace(chr(39), chr(8217))}',\n",
            1,
        )
    TYPES.write_text(t)

    # package.json
    pkg = PKG.read_text()
    pkg, n = re.subn(r'"version": "[^"]+"', f'"version": "{new}"', pkg, count=1)
    if n:
        PKG.write_text(pkg)

    # CHANGELOG.md
    today = date.today().isoformat()
    block = f'''## [{new}] - {today}

### Changed
- {notes}

---

'''
    if CL.exists():
        md = CL.read_text()
        if f'[{new}]' not in md:
            if '---\n\n' in md:
                a, b = md.split('---\n\n', 1)
                md = a + '---\n\n' + block + b
            else:
                md = md + '\n' + block
            CL.write_text(md)
    else:
        CL.write_text(f'# Changelog\n\n---\n\n{block}')

    print(f'{current} -> {new}')


if __name__ == '__main__':
    main()
