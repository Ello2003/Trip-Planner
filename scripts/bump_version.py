#!/usr/bin/env python3
"""Bump APP_VERSION (types.ts), package.json, in-app CHANGELOG, and CHANGELOG.md.

Usage:
  python3 scripts/bump_version.py              # patch +1, notes from git
  python3 scripts/bump_version.py minor
  python3 scripts/bump_version.py major
  python3 scripts/bump_version.py 1.26.0 "Exact notes"
  python3 scripts/bump_version.py patch "Notes about this release"

When notes are omitted, the script summarises recent non-bump commits and
touched paths so the changelog is never a bare “Auto bump after …” line.
"""
from __future__ import annotations

import re
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TYPES = ROOT / 'src' / 'types.ts'
PKG = ROOT / 'package.json'
CL = ROOT / 'CHANGELOG.md'

# Map path prefixes → short human labels for changelog bullets
PATH_LABELS = [
    (r'^src/components/NotesTab', 'Notes tab'),
    (r'^src/components/TripDocumentsPanel|^src/utils/docStore', 'Trip document uploads / storage'),
    (r'^src/components/PlanTab', 'Plan tab'),
    (r'^src/components/ResearchTab', 'Research tab'),
    (r'^src/components/BudgetTab', 'Budget tab'),
    (r'^src/components/TripDetailView', 'Trip detail / tabs'),
    (r'^src/components/MobileBottomTabs|^src/mobile\.css', 'Mobile navigation'),
    (r'^src/components/Sortable', 'Drag-and-drop'),
    (r'^src/utils/storage', 'Data load / save'),
    (r'^src/utils/uiPrefs', 'UI preference persistence'),
    (r'^src/utils/helpers', 'Shared helpers'),
    (r'^src/types\.ts', 'Types / app version'),
    (r'^src/index\.css', 'Styles'),
    (r'^src/App\.tsx', 'App shell'),
    (r'^src/context/', 'Cloud / Firebase context'),
    (r'^\.github/workflows/', 'CI workflows'),
    (r'^scripts/', 'Maintenance scripts'),
    (r'^package\.json|^package-lock', 'Dependencies'),
    (r'^CHANGELOG', 'Changelog'),
]


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
    return fmt((major, minor, patch + 1))


def run_git(*args: str) -> str:
    try:
        out = subprocess.check_output(['git', *args], cwd=ROOT, stderr=subprocess.DEVNULL)
        return out.decode('utf-8', errors='replace').strip()
    except Exception:
        return ''


def is_noise_commit(msg: str) -> bool:
    m = msg.strip().lower()
    return bool(
        re.match(r'^chore:\s*(bump|version)', m)
        or re.match(r'^chore:\s*meaningful version', m)
        or 'auto bump after' in m
        or m.startswith('merge ')
        or 'travel ledger sync' in m
    )


def label_path(path: str) -> str | None:
    for pattern, label in PATH_LABELS:
        if re.search(pattern, path):
            return label
    if path.startswith('src/'):
        return path.split('/')[-1]
    return None


def notes_from_git(max_commits: int = 15) -> str:
    """Build a short prose summary from recent commits + touched areas."""
    log = run_git('log', f'-{max_commits}', '--pretty=%s')
    subjects = []
    for line in log.splitlines():
        line = line.strip()
        if not line or is_noise_commit(line):
            continue
        # Drop leading conventional-commit type for readability
        cleaned = re.sub(
            r'^(feat|fix|chore|docs|refactor|style|perf|test)(\([^)]*\))?!:\s*',
            '',
            line,
            flags=re.I,
        ).strip()
        if cleaned and cleaned not in subjects:
            subjects.append(cleaned)
        if len(subjects) >= 6:
            break

    # Files changed since last bump commit (or last 8 commits)
    last_bump = run_git('log', '-20', '--pretty=%H %s')
    range_ref = 'HEAD~8'
    for row in last_bump.splitlines():
        parts = row.split(' ', 1)
        if len(parts) == 2 and is_noise_commit(parts[1]) is False and 'bump version' in parts[1].lower():
            range_ref = f"{parts[0]}..HEAD"
            break
        if len(parts) == 2 and re.search(r'chore:.*bump', parts[1], re.I):
            range_ref = f"{parts[0]}..HEAD"
            break

    files = run_git('diff', '--name-only', range_ref)
    if not files:
        files = run_git('diff', '--name-only', 'HEAD~5..HEAD')
    areas: list[str] = []
    for path in files.splitlines():
        lab = label_path(path.strip())
        if lab and lab not in areas:
            areas.append(lab)
        if len(areas) >= 8:
            break

    bits: list[str] = []
    if subjects:
        bits.append('; '.join(subjects[:5]))
    if areas:
        bits.append('Touched: ' + ', '.join(areas) + '.')
    if not bits:
        return 'Maintenance updates across the app.'
    text = ' '.join(bits)
    # Single line, safe for in-app changelog string
    text = re.sub(r'\s+', ' ', text).strip()
    if len(text) > 420:
        text = text[:417].rstrip() + '…'
    return text


def escape_changelog_js(notes: str) -> str:
    return notes.replace('\\', '\\').replace("'", '\u2019')


def write_changelog_md(new: str, notes: str, today: str) -> None:
    # Prefer structured bullets when notes contain '; '
    bullets = [b.strip() for b in re.split(r';\s+|\n+', notes) if b.strip()]
    if len(bullets) <= 1 and notes:
        body = f'### Changed\n- {notes}\n'
    else:
        body = '### Changed\n' + ''.join(f'- {b}\n' for b in bullets)

    block = f'## [{new}] - {today}\n\n{body}\n---\n\n'
    if CL.exists():
        md = CL.read_text()
        if f'[{new}]' in md:
            # Replace existing block for this version
            md = re.sub(
                rf'## \[{re.escape(new)}\][\s\S]*?(?=\n## \[|\Z)',
                block,
                md,
                count=1,
            )
        elif '---\n\n' in md:
            a, b = md.split('---\n\n', 1)
            md = a + '---\n\n' + block + b
        else:
            md = md + '\n' + block
        CL.write_text(md)
    else:
        CL.write_text(f'# Changelog\n\n---\n\n{block}')


def set_in_app_changelog(t: str, version: str, notes: str) -> str:
    esc = escape_changelog_js(notes)
    pattern = rf"'{re.escape(version)}':\s*'[^']*'"
    if re.search(pattern, t):
        return re.sub(pattern, f"'{version}': '{esc}'", t, count=1)
    return t.replace(
        'export const CHANGELOG: Record<string, string> = {\n',
        f"export const CHANGELOG: Record<string, string> = {{\n  '{version}': '{esc}',\n",
        1,
    )


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

    if not notes or notes.lower().startswith('auto bump after'):
        notes = notes_from_git()

    if new == current:
        # Still allow rewriting notes for current version if passed explicitly
        if notes and notes != f'Maintenance release {new}.':
            t = set_in_app_changelog(TYPES.read_text(), current, notes)
            TYPES.write_text(t)
            write_changelog_md(current, notes, date.today().isoformat())
            print(f'notes updated for {current}')
        else:
            print(f'already {current}')
        return

    t = TYPES.read_text()
    t, n = re.subn(
        r"export const APP_VERSION = '[^']+';",
        f"export const APP_VERSION = '{new}';",
        t,
        count=1,
    )
    if n != 1:
        raise SystemExit('failed to set APP_VERSION')
    t = set_in_app_changelog(t, new, notes)
    TYPES.write_text(t)

    pkg = PKG.read_text()
    pkg, n = re.subn(r'"version": "[^"]+"', f'"version": "{new}"', pkg, count=1)
    if n:
        PKG.write_text(pkg)

    write_changelog_md(new, notes, date.today().isoformat())
    print(f'{current} -> {new}')
    print(f'notes: {notes}')


if __name__ == '__main__':
    main()
