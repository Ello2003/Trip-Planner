import { COUNTRIES, CITY_TO_COUNTRY, CUR, Trip, Expense, PlanItem, Category } from '../types';

let uidCounter = 0;
export function uid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${uidCounter.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function fmt(n: number | null | undefined): string {
  return CUR + (Number(n) || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function roundTo(n: number, dp: number): number {
  const f = Math.pow(10, dp);
  return Math.round((Number(n) + Number.EPSILON) * f) / f;
}

export function parseQty(v: any): number {
  if (v === '' || v == null) return 0;
  const n = Number(v);
  return isFinite(n) ? Math.max(0, roundTo(n, 4)) : 0;
}

export function parseMoney(v: any, allowBlank = false): number | null {
  if (v === '' || v == null) return allowBlank ? null : 0;
  const n = Number(v);
  if (!isFinite(n)) return allowBlank ? null : 0;
  return Math.max(0, roundTo(n, 4));
}

export function numVal(v: any): string {
  return (v == null || v === '' || !isFinite(Number(v))) ? '' : String(roundTo(Number(v), 4));
}

export function lineTotal(q: number, u: number | null | undefined): number {
  return roundTo((Number(q) || 0) * (Number(u) || 0), 2);
}

export function singleLine(str: string | null | undefined): string {
  return (str || '').replace(/[\r\n]+/g, ' ').trim();
}

export function extractMapEmbedUrl(raw: string): string {
  raw = (raw || '').trim();
  if (!raw) return '';
  const srcMatch = raw.match(/src=["']([^"']+)["']/i);
  if (srcMatch) return srcMatch[1];
  return raw;
}

export function countryFlag(code: string): string {
  if (!code || code.length !== 2) return '';
  return code.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export function countryCodeForName(name: string | null | undefined): string | null {
  if (!name) return null;
  const hit = COUNTRIES.find(c => c.name.toLowerCase() === name.trim().toLowerCase());
  return hit ? hit.code : null;
}

export function countryFlagForTrip(t: Trip): string {
  const code = countryCodeForName(t.country);
  return code ? countryFlag(code) : '';
}

export function guessCountryFromName(name: string | null | undefined): string | null {
  if (!name) return null;
  const clean = name.toLowerCase();
  const direct = COUNTRIES.find(c => new RegExp('\\b' + c.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(clean));
  if (direct) return direct.name;
  const keys = Object.keys(CITY_TO_COUNTRY).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (new RegExp('\\b' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(clean)) return CITY_TO_COUNTRY[key];
  }
  return null;
}

export function dateKeyParts(key: string | null | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const check = new Date(timestamp);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return { year, month, day, timestamp };
}

export function addDaysToDateKey(key: string | null | undefined, days: number): string | null {
  const parts = dateKeyParts(key);
  const offset = Number(days);
  if (!parts || !Number.isFinite(offset)) return null;
  return new Date(parts.timestamp + Math.trunc(offset) * 86400000).toISOString().slice(0, 10);
}

export function daysBetweenDateKeys(later: string | null | undefined, earlier: string | null | undefined): number {
  const a = dateKeyParts(later);
  const b = dateKeyParts(earlier);
  return a && b ? Math.round((a.timestamp - b.timestamp) / 86400000) : NaN;
}

export function formatDateKey(key: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  const parts = dateKeyParts(key);
  return parts ? new Date(parts.timestamp).toLocaleDateString('en-GB', Object.assign({ timeZone: 'UTC' }, options || {})) : '';
}

export function dateKeyToLocalDate(key: string | null | undefined, time?: string | null): Date | null {
  const parts = dateKeyParts(key);
  if (!parts) return null;
  const match = /^(\d{2}):(\d{2})$/.exec(String(time || '00:00'));
  const hours = match ? Number(match[1]) : 0;
  const minutes = match ? Number(match[2]) : 0;
  return new Date(parts.year, parts.month - 1, parts.day, hours, minutes, 0, 0);
}

export function daysUntil(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return daysBetweenDateKeys(dateStr, todayKey);
}

export function shortDate(dateStr: string | null | undefined): string {
  return formatDateKey(dateStr, { day: 'numeric', month: 'short' });
}

export function tripDuration(t: Trip): number | null {
  if (t.startDate && t.endDate) {
    const days = daysBetweenDateKeys(t.endDate, t.startDate) + 1;
    return days > 0 ? days : null;
  }
  if (t.timelineMode === 'days' && Array.isArray(t.planItems) && t.planItems.length) {
    let maxDay = 0;
    t.planItems.forEach(i => {
      if (i.dayNumber) maxDay = Math.max(maxDay, i.dayNumber);
      if (i.dayNumberEnd) maxDay = Math.max(maxDay, i.dayNumberEnd);
    });
    return maxDay > 0 ? maxDay : null;
  }
  return null;
}

export function expenseAmount(e: Expense): number {
  const quantity = Number(e && e.quantity);
  const unitCost = Number(e && e.unitCost);
  if (!Number.isFinite(quantity) || !Number.isFinite(unitCost)) return 0;
  return Math.max(0, quantity) * Math.max(0, unitCost);
}

export function tripTotal(trip: Trip): number {
  return (trip && Array.isArray(trip.expenses) ? trip.expenses : []).reduce((sum, e) => sum + expenseAmount(e), 0);
}

export function budgetCountedTotal(trip: Trip): number {
  return tripTotal(trip);
}

export function tripCategoryTotals(trip: Trip, categories: Category[]): Record<string, number> {
  const totals: Record<string, number> = {};
  categories.forEach(c => (totals[c.name] = 0));
  (trip.expenses || []).forEach(e => {
    totals[e.category] = (totals[e.category] || 0) + (Number(e.quantity) || 0) * (Number(e.unitCost) || 0);
  });
  return totals;
}

export function timelineTimeMinutes(value: string | null | undefined): number {
  if (value == null) return Number.POSITIVE_INFINITY;
  const raw = String(value).trim().toUpperCase();
  if (!raw) return Number.POSITIVE_INFINITY;
  let match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const h = Number(match[1]), m = Number(match[2]);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59 ? h * 60 + m : Number.POSITIVE_INFINITY;
  }
  match = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match) {
    let h = Number(match[1]), m = Number(match[2]);
    if (h < 1 || h > 12 || m > 59) return Number.POSITIVE_INFINITY;
    if (h === 12) h = 0;
    if (match[3] === 'PM') h += 12;
    return h * 60 + m;
  }
  return Number.POSITIVE_INFINITY;
}

export function compareTimelineItems(a: PlanItem, b: PlanItem): number {
  const at = timelineTimeMinutes(a.time);
  const bt = timelineTimeMinutes(b.time);
  if (at !== bt) return at - bt;
  return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
}

export function sortTimelineItems(items: PlanItem[]): PlanItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const byTime = compareTimelineItems(a.item, b.item);
      return byTime || a.index - b.index;
    })
    .map(entry => entry.item);
}
