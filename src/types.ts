export interface Category {
  name: string;
  color: string;
}

export interface Sheet {
  key: string;
  color: string;
}

export interface LinkItem {
  id: string;
  label: string;
  url: string;
}

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  flag: string;
  rateToGbp: number; // reference: 1 unit of currency in GBP
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', rateToGbp: 1.0 },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', rateToGbp: 0.855 },
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', rateToGbp: 0.782 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵', rateToGbp: 0.00512 },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', flag: '🇨🇭', rateToGbp: 0.884 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺', rateToGbp: 0.512 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦', rateToGbp: 0.569 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬', rateToGbp: 0.582 },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', flag: '🇦🇪', rateToGbp: 0.213 },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', flag: '🇹🇭', rateToGbp: 0.0215 },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', flag: '🇭🇰', rateToGbp: 0.100 },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', flag: '🇳🇿', rateToGbp: 0.465 },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', flag: '🇸🇪', rateToGbp: 0.074 },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', flag: '🇳🇴', rateToGbp: 0.072 },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', flag: '🇩🇰', rateToGbp: 0.115 },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', flag: '🇨🇿', rateToGbp: 0.034 },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', flag: '🇭🇺', rateToGbp: 0.00215 },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', flag: '🇵🇱', rateToGbp: 0.198 },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', flag: '🇹🇷', rateToGbp: 0.0232 },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', flag: '🇿🇦', rateToGbp: 0.0435 },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷', rateToGbp: 0.141 },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso', flag: '🇲🇽', rateToGbp: 0.0392 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', rateToGbp: 0.0926 },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', flag: '🇮🇩', rateToGbp: 0.000049 },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', flag: '🇻🇳', rateToGbp: 0.000031 }
];

export interface Expense {
  id: string;
  description: string;
  category: string;
  quantity: number;
  unitCost: number | null;
  notes?: string;
  rating?: number | null;
  mirror?: boolean;
  currency?: string;
  originalCost?: number | null;
  exchangeRate?: number | null;
  homeCurrency?: string;
}

export interface ManualEstimate {
  id: string;
  description: string;
  category: string;
  quantity: number;
  unitCost: number;
  actualExpenseId?: string | null;
  currency?: string;
  originalCost?: number | null;
  exchangeRate?: number | null;
  homeCurrency?: string;
}

export interface PlanItem {
  id: string;
  sheet: string;
  name: string;
  status: 'idea' | 'booked' | 'cancelled';
  date: string | null;
  endDate: string | null;
  time: string | null;
  dayNumber: number | null;
  dayNumberEnd: number | null;
  location: string;
  links: LinkItem[];
  cost: number | null;
  currency?: string;
  originalCost?: number | null;
  exchangeRate?: number | null;
  homeCurrency?: string;
  linkedExpenseId: string | null;
  actualExpenseId: string | null;
  notes: string;
  visited: boolean;
  /** Star priority 1-5 carried from Research when promoted */
  priority?: number | null;

  actualNotes?: string;
  actualRating?: number | null;
  estimateQuantity?: number;
  estimateCategory?: string | null;
  estimateOriginal?: {
    name: string;
    sheet: string;
    category: string;
    quantity: number;
    cost: number | null;
  } | null;
  timelineOrder?: number;
  _start?: number;
  _span?: number;
}

export interface ResearchItem {
  id: string;
  sheet: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  priceLevel: number | null;
  priority: number | null;
  estCost: number | null;
  notes: string;
  links: LinkItem[];
  status: 'researching' | 'shortlisted' | 'promoted' | 'dismissed';
  linkedPlanItemId: string | null;
  createdAt: number;
}

export interface LuggageBag {
  id: string;
  name: string;
  type: 'carry_on' | 'checked' | 'personal_item' | 'garment_bag' | 'specialty_case';
  colorTag?: string;
  maxWeightKg: number;
  currentWeightKg?: number;
  notes?: string;
}

export interface TravelOutfitPiece {
  id: string;
  name: string;
  type: 'top' | 'jacket' | 'trousers' | 'footwear' | 'accessory' | 'fragrance' | 'other';
}

export interface TravelOutfit {
  id: string;
  dayNumber?: number | null;
  date?: string | null;
  occasion: string;
  timeOfDay: 'day' | 'evening' | 'all_day' | 'travel';
  pieces: TravelOutfitPiece[];
  footwear?: string;
  weatherNote?: string;
  wornStatus: 'planned' | 'worn' | 'packed';
  notes?: string;
}

export interface TravelHaulItem {
  id: string;
  name: string;
  category: 'cigars' | 'tailoring' | 'spirits' | 'perfume' | 'leather_goods' | 'accessories' | 'other';
  merchant: string;
  formatOrSpec?: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  dutyFreeCategory?: 'tobacco' | 'alcohol' | 'goods' | 'none';
  customsValueGbp?: number;
  notes?: string;
  dateAcquired?: string;
}

export interface TravelLoungeVisit {
  id: string;
  venueName: string;
  city: string;
  date: string;
  rating: number;
  pairingOrSelection?: string;
  atmosphereNotes?: string;
  isPrivateOrMembersClub?: boolean;
}

export interface PackingItem {
  id: string;
  category: string;
  name: string;
  qty: number;
  packed: boolean;
  assignedBagId?: string | null;
  careStatus?: 'fresh' | 'worn' | 'laundry' | 'dry_clean';
  brandOrNote?: string;
}

// ---- Trip Notes & Web Clips ----
export interface NoteEntry {
  id: string;
  text: string;
  kind: 'note' | 'voice';
  createdAt: number;
}

export interface WebClip {
  id: string;
  site: string;
  title: string;
  url: string;
  why: string;
  createdAt: number;
}

export interface GeoPin {
  id: string;
  label: string;
  coords: string; // "lat, lng" or ''
  url: string; // Google Maps link or ''
  note: string;
  createdAt: number;
}

export type SafetyLevel = '' | 'low' | 'medium' | 'high';

export interface TripPractical {
  currency: string;
  safety: SafetyLevel;
  emergency: string;
  apps: string[];
}

export interface TripNotesData {
  entries: NoteEntry[];
  clips: WebClip[];
  pins: GeoPin[];
  practical: TripPractical;
  legacyMigrated?: boolean;
}

export interface Trip {
  id: string;
  name: string;
  year: number;
  status: 'upcoming' | 'completed' | 'cancelled' | 'archived';
  isArchived?: boolean;
  budget: number;
  startDate: string | null;
  endDate: string | null;
  travelers: number;
  notes: string;
  tripNotes?: TripNotesData;
  expenses: Expense[];
  planItems: PlanItem[];
  timelineMode: 'dates' | 'days';
  timelineManualOrder?: boolean;
  research: ResearchItem[];
  packingList: PackingItem[];
  luggageBags?: LuggageBag[];
  outfits?: TravelOutfit[];
  hauls?: TravelHaulItem[];
  loungeVisits?: TravelLoungeVisit[];
  country: string;
  countryGuessed: boolean;
  mapEmbedUrl: string;
  manualEstimates: ManualEstimate[];
  hiddenSheets: string[];
  sectionMapUrls: Record<string, string>;
  ownerId?: string;
  homeCurrency?: string;
  defaultExpenseCurrency?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TrashTrip extends Trip {
  deletedAt: number;
}

export interface TrashExpenseItem {
  id: string;
  tripId: string;
  tripName: string;
  expense: Expense;
  deletedAt: number;
}

export interface TrashState {
  trips: TrashTrip[];
  expenses: TrashExpenseItem[];
}

export interface ActivityLogItem {
  id: string;
  ts: number;
  action: string;
  detail: string;
}

export interface Settings {
  mapsApiKey: string;
  homeCurrency?: string;
  githubEnabled: boolean;
  githubToken: string;
  githubOwner: string;
  githubRepo: string;
  githubPath: string;
  githubBranch: string;
  githubSha: string | null;
  githubLastSyncAt: number | null;
  tripTabOrder: string[];
  disabledTabs?: string[];
  // Feature customisation & display toggles
  showHaulBadges?: boolean;
  showAttireBadges?: boolean;
  showLuggageBadges?: boolean;
  showCountdownBadge?: boolean;
  showUpNextStrip?: boolean;
  showItineraryMap?: boolean;
  showResearchMap?: boolean;
  enableCurrencyConverter?: boolean;
  defaultShowArchived?: boolean;
}

export interface TripSummary {
  id: string;
  name: string;
  year: number;
  status: string;
  budget: number;
  expenseCount: number;
  planItemCount: number;
  country?: string;
}

export interface BackupSnapshot {
  id: string;
  name: string;
  trigger: 'auto' | 'manual' | 'checkpoint';
  timestamp: number;
  tripCount: number;
  tripsSummary: TripSummary[];
  changesSummary?: string;
  ownerId?: string;
  state: {
    trips: Trip[];
    categories: Category[];
    sheets: Sheet[];
    settings?: Settings;
  };
}

export interface AppState {
  categories: Category[];
  sheets: Sheet[];
  trips: Trip[];
  trash: TrashState;
  activityLog: ActivityLogItem[];
  settings: Settings;
}

export interface HistoryEntry {
  dateKey: string;
  timestamp: number;
  snapshot: string;
}

export const CUR = '£';
export const APP_VERSION = '1.22.0';

export const SHEET_TO_CAT: Record<string, string> = {
  'Hotels': 'Hotels',
  'Restaurants': 'Food & Drink',
  'Cheap Eats': 'Food & Drink',
  'Bars': 'Food & Drink',
  'Coffee': 'Food & Drink',
  'Coffee Shops': 'Food & Drink',
  'Activities': 'Excursions',
  'Sights': 'Excursions',
  'Things To Do': 'Excursions',
  'Transport / Transfers': 'Transportation',
  'Suit Supply': 'Shopping',
  'Shopping': 'Shopping',
  'Pubs': 'Food & Drink',
  'Wine Bars': 'Food & Drink',
  'Cocktails': 'Food & Drink',
  'Cigars': 'Misc',
};

export const PACKING_CATEGORIES = [
  { key: 'Clothing', color: '#35597a' },
  { key: 'Toiletries', color: '#6a4a6e' },
  { key: 'Documents', color: '#a63a2e' },
  { key: 'Electronics', color: '#5b6672' },
  { key: 'Health', color: '#35695c' },
  { key: 'Misc', color: '#8a7a3a' }
];

export const PACKING_ESSENTIALS = [
  { name: 'Passport', category: 'Documents', qty: 1 },
  { name: 'Boarding passes / e-tickets', category: 'Documents', qty: 1 },
  { name: 'Travel insurance docs', category: 'Documents', qty: 1 },
  { name: 'Phone charger', category: 'Electronics', qty: 1 },
  { name: 'Travel adapter', category: 'Electronics', qty: 1 },
  { name: 'Headphones', category: 'Electronics', qty: 1 },
  { name: 'Toothbrush', category: 'Toiletries', qty: 1 },
  { name: 'Toothpaste', category: 'Toiletries', qty: 1 },
  { name: 'Deodorant', category: 'Toiletries', qty: 1 },
  { name: 'Sunscreen', category: 'Toiletries', qty: 1 },
  { name: 'Medication', category: 'Health', qty: 1 },
  { name: 'Painkillers', category: 'Health', qty: 1 },
  { name: 'Underwear', category: 'Clothing', qty: 7 },
  { name: 'Socks', category: 'Clothing', qty: 7 },
  { name: 'Sunglasses', category: 'Clothing', qty: 1 },
  { name: 'Swimwear', category: 'Clothing', qty: 1 }
];

export const TRIP_TAB_LABELS: Record<string, string> = {
  budget: 'Budget',
  charts: 'Charts',
  plan: 'Plan',
  attire: 'Attire & Bags',
  hauls: 'Lounges & Hauls',
  research: 'Research',
  posttrip: 'Visited',
  packing: 'Packing',
  notes: 'Notes'
};

export const CHANGELOG: Record<string, string> = {
  '1.22.0': 'Added a Notes tab to every trip with four sections: My Raw Context and Audio Logs for first-person journal notes with optional voice dictation, Web Clips and References saved as Site - Title links with a one-line reason and copy-as-Markdown, Saved Geo-Pins for coordinates or Google Maps links with one-tap Open in Maps and a use-my-location button, and a Practical Dashboard for currency, safety level, emergency number and essential apps. Added automatic migration of any existing single-line trip note into the new journal, and notes are included in trip duplicates, backups, cloud sync and GitHub sync. Improved the Reorder Tabs list so the new Notes tab can be moved or hidden like any other tab.',
  '1.21.0': 'Added a Data & Sync tab to Settings that groups Export, Import, the Backup & Recovery Vault, GitHub Push, Pull and set-up, Trash and the Activity Log into clearly labelled sections. Improved the header by moving Settings to the top-right corner beside the single version button, and moved GitHub Push and Pull out of the header into Settings with a clear connected or not-configured status. Removed the footer, as every link it held now lives in the header or in Settings, so Version History and Settings each appear only once.',
  '1.20.0': 'Added inline editing of section headers on the Plan, Research and Visited tabs: click the pencil or double-click a name to rename it, or click the colour dot to recolour it, with Enter to save, Esc to cancel and duplicate-name protection. Added automatic carry-over when a category or section is renamed, so plan and research items, per-trip map links, hidden sections, budget categories, manual estimates and trashed trips all follow the new name. Added a safeguard so a renamed section keeps its default budget category instead of dropping to Other. Fixed deleting an expense category so its expenses are moved to Other, as the confirmation promised. Fixed category name fields losing focus after every keystroke and swallowing spaces, and allowed the field to be cleared while retyping. Fixed the Version History and Backup & Recovery dialogs, which were unstyled because they relied on Tailwind classes, and rebuilt them to match the Settings dialog. Improved the header toolbar with a single consistent button row, grouped Undo/Redo and Git controls, an account menu that closes on outside click and a responsive status line. Improved the Official Website auto-fill from address lookup so it always adds a new link, never replaces existing ones and skips near-duplicate URLs.',
  '1.19.0': 'Renamed application to Trip Planner across all views and document headers. Completely overhauled and reorganized the top-right header control deck with streamlined profile authentication dropdown, live Cloud Protected status badge, compact GitHub push/pull segmented pills, split undo/redo controls, and dedicated triggers for Currency Converter and Settings. Redesigned Version History (Annals & Changelog) with category badges and instant keyword search, redesigned Backup & Recovery Vault with visual snapshots, modernized the Activity Log modal with filter tabs, and upgraded the Settings Hub into a luxury tabbed control center with custom toggle cards and live badge previews.',
  '1.18.3': 'Unified Google Maps initialization into single top-level APIProvider in App.tsx to eliminate duplicate script tags and loader conflicts, added cross-origin script error protection in main.tsx, and ensured maps helper uses anonymous crossorigin attribute.',
  '1.18.2': 'Resolved Firestore collection list permission error for users/trips by decoupling collection list queries from document ID validation, opened test probe read access, and made GitHub Pages base path conditional on GITHUB_ACTIONS environment to prevent dev server pre-warming 302 redirects.',
  '1.18.1': 'Fixed React singleton resolution and Vite dependency pre-bundling configuration (resolve.dedupe & optimizeDeps for react and react-dom), resolving the "Invalid hook call: null is not an object (evaluating resolveDispatcher().useState)" error.',
  '1.18.0': 'Added Trip Archive status allowing trips to be hidden from the dashboard and toggled via the dashboard header with instant restore. Cleaned up boarding passes by removing haul/attire badges by default, backed by comprehensive feature toggles in settings. Fixed Google Maps place search and geocoding in Name/Search to reliably resolve real addresses and display them directly on maps without legacy widget errors.',
  '1.17.0': 'Added Cloud Firestore incremental backup and recovery management with safety checkpoints, snapshot inspection, and selective single-trip restoration. Added GitHub Connection Tester with comprehensive diagnostic checks for token scopes and branch status. Introduced inline & modal tab customization with enable/disable toggles (attire & hauls disabled by default with one-click presets) and resolved duplicate packing tab rendering.',
  '1.16.0': 'Added interactive Google Maps component for the Research section featuring AdvancedMarker elements, category/sheet filtering with item counts, Places API geocoding, InfoWindows with instant "Promote to Plan" actions, and list/map view modes.',
  '1.15.0': 'Added interactive Google Maps itinerary component in TripDetailView featuring AdvancedMarker elements, day-by-day and category filtering, Places API geocoding, InfoWindows, and settings API key integration.',
  '1.14.0': 'Added Cloud Firestore real-time persistence with offline synchronization, luxury heritage aesthetic (warm vellum, burnished brass foil, perforated boarding tickets), dedicated Travel Luggage & Attire Manifest, and Travel Lounge & Specialty Haul diary.',
  '1.13.4': 'An Actual row that is still blank no longer overwrites your own edits to its description, category or quantity: it follows the estimate only until you change it yourself.',
  '1.13.3': 'Fixed the spinner arrows on Qty / Unit Cost fields: the column-resize hit area was swallowing presses on the arrows and starting a column resize instead.',
  '1.13.2': 'Quantity / unit-cost spinner arrows now work repeatedly: each click used to rebuild the whole table and drop focus after one step.',
  '1.13.1': 'Quantity and unit-cost fields now share one set of number helpers across Estimated, Actual and Visited tables.',
  '1.13.0': 'Every planned cost now has a matching Actual Expenses row for all trips.',
  '1.12.0': 'Applied the London trip layout as the shared trip default: Days timeline with manual ordering and dedicated Charts tab.',
  '1.11.8': 'Standardized Plan, Research, Visited, and Packing table resizing.',
  '1.9.0': 'GitHub Sync with push/pull buttons and backup recovery points.',
  '1.8.4': 'Google Maps toggle for Research sections.',
  '1.8.3': 'Undo/Redo covering recent session changes.',
  '1.8.2': 'Automatic rolling backup history snapshot.',
  '1.7.5': 'Added Visited tab with visit completion tracking.'
};

export const COUNTRIES = [
  {code:'AF',name:'Afghanistan'},{code:'AL',name:'Albania'},{code:'DZ',name:'Algeria'},{code:'AD',name:'Andorra'},{code:'AO',name:'Angola'},
  {code:'AG',name:'Antigua and Barbuda'},{code:'AR',name:'Argentina'},{code:'AM',name:'Armenia'},{code:'AU',name:'Australia'},{code:'AT',name:'Austria'},
  {code:'AZ',name:'Azerbaijan'},{code:'BS',name:'Bahamas'},{code:'BH',name:'Bahrain'},{code:'BD',name:'Bangladesh'},{code:'BB',name:'Barbados'},
  {code:'BY',name:'Belarus'},{code:'BE',name:'Belgium'},{code:'BZ',name:'Belize'},{code:'BJ',name:'Benin'},{code:'BT',name:'Bhutan'},
  {code:'BO',name:'Bolivia'},{code:'BA',name:'Bosnia and Herzegovina'},{code:'BW',name:'Botswana'},{code:'BR',name:'Brazil'},{code:'BN',name:'Brunei'},
  {code:'BG',name:'Bulgaria'},{code:'BF',name:'Burkina Faso'},{code:'BI',name:'Burundi'},{code:'KH',name:'Cambodia'},{code:'CM',name:'Cameroon'},
  {code:'CA',name:'Canada'},{code:'CV',name:'Cape Verde'},{code:'CF',name:'Central African Republic'},{code:'TD',name:'Chad'},{code:'CL',name:'Chile'},
  {code:'CN',name:'China'},{code:'CO',name:'Colombia'},{code:'KM',name:'Comoros'},{code:'CG',name:'Congo'},{code:'CD',name:'Congo (DRC)'},
  {code:'CR',name:'Costa Rica'},{code:'HR',name:'Croatia'},{code:'CU',name:'Cuba'},{code:'CY',name:'Cyprus'},{code:'CZ',name:'Czechia'},
  {code:'DK',name:'Denmark'},{code:'DJ',name:'Djibouti'},{code:'DM',name:'Dominica'},{code:'DO',name:'Dominican Republic'},{code:'EC',name:'Ecuador'},
  {code:'EG',name:'Egypt'},{code:'SV',name:'El Salvador'},{code:'GQ',name:'Equatorial Guinea'},{code:'ER',name:'Eritrea'},{code:'EE',name:'Estonia'},
  {code:'SZ',name:'Eswatini'},{code:'ET',name:'Ethiopia'},{code:'FJ',name:'Fiji'},{code:'FI',name:'Finland'},{code:'FR',name:'France'},
  {code:'GA',name:'Gabon'},{code:'GM',name:'Gambia'},{code:'GE',name:'Georgia'},{code:'DE',name:'Germany'},{code:'GH',name:'Ghana'},
  {code:'GR',name:'Greece'},{code:'GD',name:'Grenada'},{code:'GT',name:'Guatemala'},{code:'GN',name:'Guinea'},{code:'GW',name:'Guinea-Bissau'},
  {code:'GY',name:'Guyana'},{code:'HT',name:'Haiti'},{code:'HN',name:'Honduras'},{code:'HK',name:'Hong Kong'},{code:'HU',name:'Hungary'},
  {code:'IS',name:'Iceland'},{code:'IN',name:'India'},{code:'ID',name:'Indonesia'},{code:'IR',name:'Iran'},{code:'IQ',name:'Iraq'},
  {code:'IE',name:'Ireland'},{code:'IL',name:'Israel'},{code:'IT',name:'Italy'},{code:'JM',name:'Jamaica'},{code:'JP',name:'Japan'},
  {code:'JO',name:'Jordan'},{code:'KZ',name:'Kazakhstan'},{code:'KE',name:'Kenya'},{code:'KI',name:'Kiribati'},{code:'KW',name:'Kuwait'},
  {code:'KG',name:'Kyrgyzstan'},{code:'LA',name:'Laos'},{code:'LV',name:'Latvia'},{code:'LB',name:'Lebanon'},{code:'LS',name:'Lesotho'},
  {code:'LR',name:'Liberia'},{code:'LY',name:'Libya'},{code:'LI',name:'Liechtenstein'},{code:'LT',name:'Lithuania'},{code:'LU',name:'Luxembourg'},
  {code:'MO',name:'Macao'},{code:'MG',name:'Madagascar'},{code:'MW',name:'Malawi'},{code:'MY',name:'Malaysia'},{code:'MV',name:'Maldives'},
  {code:'ML',name:'Mali'},{code:'MT',name:'Malta'},{code:'MH',name:'Marshall Islands'},{code:'MR',name:'Mauritania'},{code:'MU',name:'Mauritius'},
  {code:'MX',name:'Mexico'},{code:'FM',name:'Micronesia'},{code:'MD',name:'Moldova'},{code:'MC',name:'Monaco'},{code:'MN',name:'Mongolia'},
  {code:'ME',name:'Montenegro'},{code:'MA',name:'Morocco'},{code:'MZ',name:'Mozambique'},{code:'MM',name:'Myanmar'},{code:'NA',name:'Namibia'},
  {code:'NR',name:'Nauru'},{code:'NP',name:'Nepal'},{code:'NL',name:'Netherlands'},{code:'NZ',name:'New Zealand'},{code:'NI',name:'Nicaragua'},
  {code:'NE',name:'Niger'},{code:'NG',name:'Nigeria'},{code:'KP',name:'North Korea'},{code:'MK',name:'North Macedonia'},{code:'NO',name:'Norway'},
  {code:'OM',name:'Oman'},{code:'PK',name:'Pakistan'},{code:'PW',name:'Palau'},{code:'PS',name:'Palestine'},{code:'PA',name:'Panama'},
  {code:'PG',name:'Papua New Guinea'},{code:'PY',name:'Paraguay'},{code:'PE',name:'Peru'},{code:'PH',name:'Philippines'},{code:'PL',name:'Poland'},
  {code:'PT',name:'Portugal'},{code:'PR',name:'Puerto Rico'},{code:'QA',name:'Qatar'},{code:'RO',name:'Romania'},{code:'RU',name:'Russia'},
  {code:'RW',name:'Rwanda'},{code:'KN',name:'Saint Kitts and Nevis'},{code:'LC',name:'Saint Lucia'},{code:'VC',name:'Saint Vincent and the Grenadines'},
  {code:'WS',name:'Samoa'},{code:'SM',name:'San Marino'},{code:'ST',name:'Sao Tome and Principe'},{code:'SA',name:'Saudi Arabia'},{code:'SN',name:'Senegal'},
  {code:'RS',name:'Serbia'},{code:'SC',name:'Seychelles'},{code:'SL',name:'Sierra Leone'},{code:'SG',name:'Singapore'},{code:'SK',name:'Slovakia'},
  {code:'SI',name:'Slovenia'},{code:'SB',name:'Solomon Islands'},{code:'SO',name:'Somalia'},{code:'ZA',name:'South Africa'},{code:'KR',name:'South Korea'},
  {code:'SS',name:'South Sudan'},{code:'ES',name:'Spain'},{code:'LK',name:'Sri Lanka'},{code:'SD',name:'Sudan'},{code:'SR',name:'Suriname'},
  {code:'SE',name:'Sweden'},{code:'CH',name:'Switzerland'},{code:'SY',name:'Syria'},{code:'TW',name:'Taiwan'},{code:'TJ',name:'Tajikistan'},
  {code:'TZ',name:'Tanzania'},{code:'TH',name:'Thailand'},{code:'TL',name:'Timor-Leste'},{code:'TG',name:'Togo'},{code:'TO',name:'Tonga'},
  {code:'TT',name:'Trinidad and Tobago'},{code:'TN',name:'Tunisia'},{code:'TR',name:'Turkey'},{code:'TM',name:'Turkmenistan'},{code:'TV',name:'Tuvalu'},
  {code:'UG',name:'Uganda'},{code:'UA',name:'Ukraine'},{code:'AE',name:'United Arab Emirates'},{code:'GB',name:'United Kingdom'},{code:'US',name:'United States'},
  {code:'UY',name:'Uruguay'},{code:'UZ',name:'Uzbekistan'},{code:'VU',name:'Vanuatu'},{code:'VA',name:'Vatican City'},{code:'VE',name:'Venezuela'},
  {code:'VN',name:'Vietnam'},{code:'YE',name:'Yemen'},{code:'ZM',name:'Zambia'},{code:'ZW',name:'Zimbabwe'}
];

export const CITY_TO_COUNTRY: Record<string, string> = {
  'bruges':'Belgium','brugge':'Belgium','brussels':'Belgium','ghent':'Belgium','antwerp':'Belgium',
  'paris':'France','nice':'France','lyon':'France','marseille':'France','bordeaux':'France','provence':'France','normandy':'France','strasbourg':'France','cannes':'France','avignon':'France','chamonix':'France',
  'london':'United Kingdom','liverpool':'United Kingdom','manchester':'United Kingdom','edinburgh':'United Kingdom','glasgow':'United Kingdom','bristol':'United Kingdom','york':'United Kingdom','bath':'United Kingdom','oxford':'United Kingdom','cambridge':'United Kingdom','cornwall':'United Kingdom','brighton':'United Kingdom','belfast':'United Kingdom','cardiff':'United Kingdom','lake district':'United Kingdom',
  'rome':'Italy','venice':'Italy','florence':'Italy','milan':'Italy','naples':'Italy','sicily':'Italy','tuscany':'Italy','amalfi':'Italy','verona':'Italy','turin':'Italy','pisa':'Italy','bologna':'Italy','sardinia':'Italy','lake como':'Italy','cinque terre':'Italy',
  'santorini':'Greece','athens':'Greece','mykonos':'Greece','crete':'Greece','rhodes':'Greece','corfu':'Greece','zakynthos':'Greece','thessaloniki':'Greece','naxos':'Greece',
  'madrid':'Spain','barcelona':'Spain','seville':'Spain','valencia':'Spain','granada':'Spain','ibiza':'Spain','mallorca':'Spain','majorca':'Spain','malaga':'Spain','bilbao':'Spain','tenerife':'Spain','canary islands':'Spain','san sebastian':'Spain',
  'lisbon':'Portugal','porto':'Portugal','algarve':'Portugal','madeira':'Portugal','sintra':'Portugal',
  'amsterdam':'Netherlands','rotterdam':'Netherlands','the hague':'Netherlands','utrecht':'Netherlands',
  'berlin':'Germany','munich':'Germany','hamburg':'Germany','cologne':'Germany','frankfurt':'Germany','bavaria':'Germany','black forest':'Germany','dresden':'Germany',
  'vienna':'Austria','salzburg':'Austria','innsbruck':'Austria','tyrol':'Austria',
  'zurich':'Switzerland','geneva':'Switzerland','interlaken':'Switzerland','zermatt':'Switzerland','lucerne':'Switzerland','bern':'Switzerland',
  'dublin':'Ireland','galway':'Ireland','cork':'Ireland',
  'reykjavik':'Iceland',
  'copenhagen':'Denmark','stockholm':'Sweden','gothenburg':'Sweden','oslo':'Norway','bergen':'Norway','lofoten':'Norway','helsinki':'Finland','lapland':'Finland',
  'prague':'Czechia','budapest':'Hungary','warsaw':'Poland','krakow':'Poland','zagreb':'Croatia','dubrovnik':'Croatia','split':'Croatia','hvar':'Croatia','ljubljana':'Slovenia','bled':'Slovenia',
  'istanbul':'Turkey','cappadocia':'Turkey','antalya':'Turkey','bodrum':'Turkey',
  'moscow':'Russia','st petersburg':'Russia',
  'malta':'Malta','valletta':'Malta','cyprus':'Cyprus','monaco':'Monaco',
  'new york':'United States','los angeles':'United States','san francisco':'United States','las vegas':'United States','chicago':'United States','miami':'United States','orlando':'United States','boston':'United States','seattle':'United States','hawaii':'United States','washington dc':'United States','new orleans':'United States','austin':'United States','denver':'United States','nashville':'United States','yellowstone':'United States',
  'toronto':'Canada','vancouver':'Canada','montreal':'Canada','banff':'Canada','quebec city':'Canada','niagara falls':'Canada',
  'cancun':'Mexico','mexico city':'Mexico','tulum':'Mexico','playa del carmen':'Mexico',
  'havana':'Cuba','kingston':'Jamaica','nassau':'Bahamas','punta cana':'Dominican Republic',
  'rio de janeiro':'Brazil','sao paulo':'Brazil','buenos aires':'Argentina','santiago':'Chile','lima':'Peru','machu picchu':'Peru','cusco':'Peru','bogota':'Colombia','cartagena':'Colombia','quito':'Ecuador','galapagos':'Ecuador',
  'cairo':'Egypt','marrakech':'Morocco','casablanca':'Morocco','fes':'Morocco','cape town':'South Africa','johannesburg':'South Africa','nairobi':'Kenya','zanzibar':'Tanzania','serengeti':'Tanzania',
  'dubai':'United Arab Emirates','abu dhabi':'United Arab Emirates','doha':'Qatar','tel aviv':'Israel','jerusalem':'Israel','amman':'Jordan','petra':'Jordan',
  'tokyo':'Japan','kyoto':'Japan','osaka':'Japan','okinawa':'Japan','hokkaido':'Japan',
  'beijing':'China','shanghai':'China','hong kong':'Hong Kong','shenzhen':'China',
  'seoul':'South Korea','busan':'South Korea','taipei':'Taiwan',
  'bangkok':'Thailand','phuket':'Thailand','chiang mai':'Thailand','koh samui':'Thailand',
  'singapore':'Singapore','kuala lumpur':'Malaysia','bali':'Indonesia','jakarta':'Indonesia','ubud':'Indonesia',
  'hanoi':'Vietnam','ho chi minh city':'Vietnam','siem reap':'Cambodia','luang prabang':'Laos',
  'manila':'Philippines','boracay':'Philippines',
  'mumbai':'India','delhi':'India','goa':'India','jaipur':'India','kerala':'India','agra':'India',
  'kathmandu':'Nepal','male':'Maldives','maldives':'Maldives',
  'sydney':'Australia','melbourne':'Australia','brisbane':'Australia','perth':'Australia','gold coast':'Australia','auckland':'New Zealand','queenstown':'New Zealand','wellington':'New Zealand',
  'fiji':'Fiji'
};
