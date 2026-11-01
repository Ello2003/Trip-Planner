import React, { useState, useEffect, useRef } from 'react';
import {
  Trip,
  Category,
  Sheet,
  PlanItem,
  ResearchItem,
  Settings,
  TrashState,
  ActivityLogItem,
  HistoryEntry,
  LinkItem,
  COUNTRIES,
  PACKING_CATEGORIES,
  CHANGELOG,
  CUR,
  TRIP_TAB_LABELS,
  SUPPORTED_CURRENCIES
} from '../types';
import { uid, singleLine, guessCountryFromName, fmt } from '../utils/helpers';
import { resolveExpenseCategory } from '../utils/storage';
import {
  githubUserError,
  githubPushRemote,
  githubFetchRemote,
  githubConfigured,
  githubTestConnection,
  GithubTestResult
} from '../utils/githubSync';
import { getDefaultExchangeRate, getCurrencyInfo, formatCurrencyAmount } from '../utils/currency';
import { searchPlaceOrAddress, ResolvedPlace, getGoogleMapsApiKey } from '../utils/mapsHelper';

// Base Modal Wrapper
export const ModalWrapper: React.FC<{
  title: string;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, wide, onClose, children }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-box ${wide ? 'wide' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
};

// 1. TripModal
export const TripModal: React.FC<{
  existing?: Trip | null;
  onClose: () => void;
  onSave: (tripData: Partial<Trip>) => void;
}> = ({ existing, onClose, onSave }) => {
  const [name, setName] = useState(existing?.name || '');
  const [country, setCountry] = useState(existing?.country || '');
  const [startDate, setStartDate] = useState(existing?.startDate || '');
  const [endDate, setEndDate] = useState(existing?.endDate || '');
  const [year, setYear] = useState(existing?.year || new Date().getFullYear());
  const [travelers, setTravelers] = useState(existing?.travelers || 2);
  const [budget, setBudget] = useState(existing ? String(existing.budget) : '');
  const [status, setStatus] = useState<Trip['status']>(
    existing?.status || 'upcoming'
  );

  const [homeCurrency, setHomeCurrency] = useState(existing?.homeCurrency || 'GBP');
  const [defaultExpenseCurrency, setDefaultExpenseCurrency] = useState(existing?.defaultExpenseCurrency || '');

  const handleNameChange = (val: string) => {
    setName(val);
    if (!existing && !country.trim()) {
      const guess = guessCountryFromName(val);
      if (guess) setCountry(guess);
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (val) {
      setYear(new Date(val + 'T00:00:00').getFullYear());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: singleLine(name),
      country: singleLine(country),
      countryGuessed: false,
      year: Number(year) || new Date().getFullYear(),
      budget: Math.max(0, Number(budget) || 0),
      status,
      travelers: Math.max(1, Number(travelers) || 1),
      startDate: startDate || null,
      endDate: endDate || null,
      homeCurrency,
      defaultExpenseCurrency: defaultExpenseCurrency || undefined
    });
  };

  return (
    <ModalWrapper title={existing ? 'Edit Trip' : 'New Trip'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Trip Name</label>
          <input
            type="text"
            placeholder="e.g. Lake District"
            value={name}
            onChange={e => handleNameChange(e.target.value)}
            autoFocus
          />
        </div>

        <div className="field">
          <label>Country (optional)</label>
          <input
            type="text"
            list="countryListModal"
            placeholder="Start typing a country…"
            value={country}
            onChange={e => setCountry(e.target.value)}
          />
          <datalist id="countryListModal">
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.name} />
            ))}
          </datalist>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Start Date (optional)</label>
            <input
              type="date"
              value={startDate}
              onChange={e => handleStartDateChange(e.target.value)}
            />
          </div>
          <div className="field">
            <label>End Date (optional)</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Year</label>
            <input
              type="number"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Travelers</label>
            <input
              type="number"
              min="1"
              value={travelers}
              onChange={e => setTravelers(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Home Currency</label>
            <select value={homeCurrency} onChange={e => setHomeCurrency(e.target.value)}>
              {SUPPORTED_CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Destination Currency (optional)</label>
            <select
              value={defaultExpenseCurrency}
              onChange={e => setDefaultExpenseCurrency(e.target.value)}
            >
              <option value="">Same as Home ({homeCurrency})</option>
              {SUPPORTED_CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} — {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Total Budget</label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={budget}
              onChange={e => setBudget(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as any)}
            >
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="archived">📦 Archived</option>
            </select>
          </div>
        </div>


        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            {existing ? 'Save Changes' : 'Create Trip'}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

// 2. AddEstimateModal
export const AddEstimateModal: React.FC<{
  trip?: Trip | null;
  categories: Category[];
  onClose: () => void;
  onSave: (estimate: {
    description: string;
    category: string;
    quantity: number;
    unitCost: number;
    currency?: string;
    originalCost?: number | null;
    exchangeRate?: number | null;
    homeCurrency?: string;
  }) => void;
}> = ({ trip, categories, onClose, onSave }) => {
  const homeCode = trip?.homeCurrency || 'GBP';
  const defaultExpenseCode = trip?.defaultExpenseCurrency || (homeCode === 'GBP' ? 'EUR' : 'GBP');

  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState(categories[0]?.name || 'Other');
  const [qty, setQty] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [useConversion, setUseConversion] = useState(false);
  const [currency, setCurrency] = useState(defaultExpenseCode);
  const [foreignCost, setForeignCost] = useState('');
  const [exchangeRate, setExchangeRate] = useState(String(getDefaultExchangeRate(defaultExpenseCode, homeCode)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) return;
    onSave({
      description: singleLine(desc),
      category,
      quantity: Math.max(0, Number(qty) || 0),
      unitCost: Math.max(0, Number(unitCost) || 0),
      currency: useConversion ? currency : homeCode,
      originalCost: useConversion && foreignCost ? parseFloat(foreignCost) : null,
      exchangeRate: useConversion ? (parseFloat(exchangeRate) || getDefaultExchangeRate(currency, homeCode)) : 1.0,
      homeCurrency: homeCode
    });
  };

  return (
    <ModalWrapper title="Add Estimated Cost" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Description</label>
          <input
            type="text"
            placeholder="e.g. Souvenir budget"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            autoFocus
          />
        </div>

        <div className="field">
          <label>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {categories.map(c => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Currency Conversion Option */}
        <div style={{ margin: '10px 0', padding: '10px', background: 'var(--paper)', borderRadius: '6px', border: '1px solid var(--paper-edge)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0, fontWeight: 600, fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={useConversion}
                onChange={e => {
                  const on = e.target.checked;
                  setUseConversion(on);
                  if (on && !foreignCost && unitCost) {
                    setForeignCost(unitCost);
                  }
                }}
                style={{ width: 'auto' }}
              />
              💱 Convert from Foreign Currency
            </label>
            {useConversion && (
              <span style={{ fontSize: '11px', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                Home: {homeCode}
              </span>
            )}
          </div>

          {useConversion && (
            <div style={{ marginTop: '10px' }}>
              <div className="field-row">
                <div className="field">
                  <label>Expense Currency</label>
                  <select
                    value={currency}
                    onChange={e => {
                      const newCur = e.target.value;
                      setCurrency(newCur);
                      const newRate = getDefaultExchangeRate(newCur, homeCode);
                      setExchangeRate(String(newRate));
                      if (foreignCost) {
                        const f = parseFloat(foreignCost) || 0;
                        setUnitCost(String(Math.round((f * newRate + Number.EPSILON) * 100) / 100));
                      }
                    }}
                  >
                    {SUPPORTED_CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code} — {c.name} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Amount in {currency}</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={foreignCost}
                    onChange={e => {
                      const val = e.target.value;
                      setForeignCost(val);
                      const f = parseFloat(val) || 0;
                      const r = parseFloat(exchangeRate) || getDefaultExchangeRate(currency, homeCode);
                      setUnitCost(String(Math.round((f * r + Number.EPSILON) * 100) / 100));
                    }}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Exchange Rate (1 {currency} = X {homeCode})</label>
                  <input
                    type="number"
                    step="any"
                    value={exchangeRate}
                    onChange={e => {
                      const val = e.target.value;
                      setExchangeRate(val);
                      const r = parseFloat(val) || 0;
                      const f = parseFloat(foreignCost) || 0;
                      if (r > 0) {
                        setUnitCost(String(Math.round((f * r + Number.EPSILON) * 100) / 100));
                      }
                    }}
                  />
                </div>
                <div className="field" style={{ alignSelf: 'flex-end', paddingBottom: '8px' }}>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => {
                      const r = getDefaultExchangeRate(currency, homeCode);
                      setExchangeRate(String(r));
                      const f = parseFloat(foreignCost) || 0;
                      setUnitCost(String(Math.round((f * r + Number.EPSILON) * 100) / 100));
                    }}
                  >
                    Default Rate
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="field-row">
          <div className="field">
            <label>Quantity</label>
            <input
              type="number"
              min="0"
              step="any"
              value={qty}
              onChange={e => setQty(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Unit Cost in {homeCode} ({getCurrencyInfo(homeCode).symbol})</label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={unitCost}
              onChange={e => setUnitCost(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Add
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

// 3. ExpenseModal (with + Add new category shortcut and currency conversion)
export const ExpenseModal: React.FC<{
  trip?: Trip | null;
  categories: Category[];
  onClose: () => void;
  onSave: (expense: {
    description: string;
    category: string;
    quantity: number;
    unitCost: number;
    currency?: string;
    originalCost?: number | null;
    exchangeRate?: number | null;
    homeCurrency?: string;
  }) => void;
  onAddNewCategory: (name: string, color: string) => void;
}> = ({ trip, categories, onClose, onSave, onAddNewCategory }) => {
  const homeCode = trip?.homeCurrency || 'GBP';
  const defaultExpenseCode = trip?.defaultExpenseCurrency || (homeCode === 'GBP' ? 'EUR' : 'GBP');

  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState(categories[0]?.name || 'Other');
  const [qty, setQty] = useState('1');
  const [cost, setCost] = useState('');
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#8a7a3a');

  const [useConversion, setUseConversion] = useState(false);
  const [currency, setCurrency] = useState(defaultExpenseCode);
  const [foreignCost, setForeignCost] = useState('');
  const [exchangeRate, setExchangeRate] = useState(String(getDefaultExchangeRate(defaultExpenseCode, homeCode)));

  const handleCategorySelect = (val: string) => {
    if (val === '__add_new__') {
      setShowNewCatInput(true);
    } else {
      setCategory(val);
    }
  };

  const handleSaveNewCat = () => {
    if (newCatName.trim()) {
      onAddNewCategory(singleLine(newCatName), newCatColor);
      setCategory(singleLine(newCatName));
      setShowNewCatInput(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      description: singleLine(desc) || 'Untitled expense',
      category,
      quantity: Math.max(0, Number(qty) || 0),
      unitCost: Math.max(0, Number(cost) || 0),
      currency: useConversion ? currency : homeCode,
      originalCost: useConversion && foreignCost ? parseFloat(foreignCost) : null,
      exchangeRate: useConversion ? (parseFloat(exchangeRate) || getDefaultExchangeRate(currency, homeCode)) : 1.0,
      homeCurrency: homeCode
    });
  };

  return (
    <ModalWrapper title="Add Expense" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Description</label>
          <input
            type="text"
            placeholder="e.g. Hotel deposit"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            autoFocus
          />
        </div>

        <div className="field">
          <label>Category</label>
          <select value={category} onChange={e => handleCategorySelect(e.target.value)}>
            {categories.map(c => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
            <option value="__add_new__">+ Add new category…</option>
          </select>
        </div>

        {showNewCatInput && (
          <div style={{ background: 'var(--paper)', padding: '10px', borderRadius: '6px', marginBottom: '12px' }}>
            <div className="field">
              <label>New Category Name</label>
              <input
                type="text"
                placeholder="e.g. Souvenirs"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="color"
                className="sheet-color"
                value={newCatColor}
                onChange={e => setNewCatColor(e.target.value)}
              />
              <button type="button" className="btn-primary btn-sm" onClick={handleSaveNewCat}>
                Add Category
              </button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setShowNewCatInput(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Currency Conversion Option */}
        <div style={{ margin: '10px 0', padding: '10px', background: 'var(--paper)', borderRadius: '6px', border: '1px solid var(--paper-edge)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0, fontWeight: 600, fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={useConversion}
                onChange={e => {
                  const on = e.target.checked;
                  setUseConversion(on);
                  if (on && !foreignCost && cost) {
                    setForeignCost(cost);
                  }
                }}
                style={{ width: 'auto' }}
              />
              💱 Convert from Foreign Currency
            </label>
            {useConversion && (
              <span style={{ fontSize: '11px', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                Home: {homeCode}
              </span>
            )}
          </div>

          {useConversion && (
            <div style={{ marginTop: '10px' }}>
              <div className="field-row">
                <div className="field">
                  <label>Expense Currency</label>
                  <select
                    value={currency}
                    onChange={e => {
                      const newCur = e.target.value;
                      setCurrency(newCur);
                      const newRate = getDefaultExchangeRate(newCur, homeCode);
                      setExchangeRate(String(newRate));
                      if (foreignCost) {
                        const f = parseFloat(foreignCost) || 0;
                        setCost(String(Math.round((f * newRate + Number.EPSILON) * 100) / 100));
                      }
                    }}
                  >
                    {SUPPORTED_CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code} — {c.name} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Amount in {currency}</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={foreignCost}
                    onChange={e => {
                      const val = e.target.value;
                      setForeignCost(val);
                      const f = parseFloat(val) || 0;
                      const r = parseFloat(exchangeRate) || getDefaultExchangeRate(currency, homeCode);
                      setCost(String(Math.round((f * r + Number.EPSILON) * 100) / 100));
                    }}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Exchange Rate (1 {currency} = X {homeCode})</label>
                  <input
                    type="number"
                    step="any"
                    value={exchangeRate}
                    onChange={e => {
                      const val = e.target.value;
                      setExchangeRate(val);
                      const r = parseFloat(val) || 0;
                      const f = parseFloat(foreignCost) || 0;
                      if (r > 0) {
                        setCost(String(Math.round((f * r + Number.EPSILON) * 100) / 100));
                      }
                    }}
                  />
                </div>
                <div className="field" style={{ alignSelf: 'flex-end', paddingBottom: '8px' }}>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => {
                      const r = getDefaultExchangeRate(currency, homeCode);
                      setExchangeRate(String(r));
                      const f = parseFloat(foreignCost) || 0;
                      setCost(String(Math.round((f * r + Number.EPSILON) * 100) / 100));
                    }}
                  >
                    Default Rate
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="field-row">
          <div className="field">
            <label>Quantity</label>
            <input
              type="number"
              min="0"
              step="any"
              value={qty}
              onChange={e => setQty(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Unit Cost in {homeCode} ({getCurrencyInfo(homeCode).symbol})</label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={cost}
              onChange={e => setCost(e.target.value)}
            />
          </div>
        </div>


        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Add Expense
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

// 4. PlanItemModal (Multi links supported)
export const PlanItemModal: React.FC<{
  trip: Trip;
  sheets: Sheet[];
  categories: Category[];
  existing?: PlanItem | null;
  defaultSheet?: string;
  prefill?: any;
  onClose: () => void;
  onSave: (item: Partial<PlanItem>, wantLinkExpense: boolean) => void;
}> = ({
  trip,
  sheets,
  categories,
  existing,
  defaultSheet,
  prefill,
  onClose,
  onSave
}) => {
  const isEdit = !!existing;
  const mode = trip.timelineMode || 'days';

  const [sheet, setSheet] = useState(existing?.sheet || defaultSheet || sheets[0]?.key || 'Activities');
  const [status, setStatus] = useState<'idea' | 'booked' | 'cancelled'>(existing?.status || 'idea');
  const [name, setName] = useState(existing?.name || '');
  const [date, setDate] = useState(existing?.date || prefill?.date || trip.startDate || '');
  const [endDate, setEndDate] = useState(existing?.endDate || '');
  const [dayNumber, setDayNumber] = useState(existing?.dayNumber ? String(existing.dayNumber) : prefill?.dayNumber ? String(prefill.dayNumber) : '1');
  const [dayNumberEnd, setDayNumberEnd] = useState(existing?.dayNumberEnd ? String(existing.dayNumberEnd) : '');
  const [time, setTime] = useState(existing?.time || '');
  const [location, setLocation] = useState(existing?.location || '');
  const [isLocating, setIsLocating] = useState(false);
  const [locationFeedback, setLocationFeedback] = useState<string | null>(null);

  const handleFindPlanLocation = async () => {
    const q = location.trim() || name.trim();
    if (!q) return;
    setIsLocating(true);
    setLocationFeedback(null);
    try {
      const results = await searchPlaceOrAddress(q, undefined, trip.name);
      if (results.length > 0) {
        const best = results[0];
        setLocation(`${best.name ? best.name + ', ' : ''}${best.address} (${best.lat.toFixed(5)}, ${best.lng.toFixed(5)})`);
        setLocationFeedback(`✅ Mapped: ${best.address}`);
      } else {
        setLocationFeedback('No exact location found. You can keep your custom entry.');
      }
    } catch (_) {
      setLocationFeedback('Could not fetch location.');
    } finally {
      setIsLocating(false);
    }
  };

  const [cost, setCost] = useState(existing?.cost != null ? String(existing.cost) : '');
  const [wantLink, setWantLink] = useState(!!existing?.linkedExpenseId);
  const [notes, setNotes] = useState(existing?.notes || '');
  const [links, setLinks] = useState<LinkItem[]>(existing?.links || []);

  const homeCode = trip?.homeCurrency || 'GBP';
  const defaultExpenseCode = existing?.currency || trip?.defaultExpenseCurrency || (homeCode === 'GBP' ? 'EUR' : 'GBP');

  const [useConversion, setUseConversion] = useState(
    !!(existing?.currency && existing.currency !== homeCode)
  );
  const [currency, setCurrency] = useState(defaultExpenseCode);
  const [foreignCost, setForeignCost] = useState(
    existing?.originalCost != null ? String(existing.originalCost) : ''
  );
  const [exchangeRate, setExchangeRate] = useState(
    existing?.exchangeRate != null
      ? String(existing.exchangeRate)
      : String(getDefaultExchangeRate(defaultExpenseCode, homeCode))
  );

  const handleAddLink = () => {
    setLinks([...links, { id: uid('link'), label: '', url: '' }]);
  };

  const handleUpdateLink = (id: string, field: 'label' | 'url', val: string) => {
    setLinks(links.map(l => (l.id === id ? { ...l, [field]: val } : l)));
  };

  const handleRemoveLink = (id: string) => {
    setLinks(links.filter(l => l.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedCost = cost === '' ? null : Math.max(0, Number(cost) || 0);
    const validLinks = links.filter(l => l.url.trim());

    onSave(
      {
        sheet,
        status,
        name: singleLine(name),
        date: mode === 'dates' ? date || null : null,
        endDate: mode === 'dates' ? endDate || null : null,
        dayNumber: mode === 'days' && dayNumber ? Number(dayNumber) : null,
        dayNumberEnd: mode === 'days' && dayNumberEnd ? Number(dayNumberEnd) : null,
        time: time || null,
        location: singleLine(location),
        links: validLinks,
        cost: parsedCost,
        currency: useConversion ? currency : homeCode,
        originalCost: useConversion && foreignCost ? parseFloat(foreignCost) : null,
        exchangeRate: useConversion ? (parseFloat(exchangeRate) || getDefaultExchangeRate(currency, homeCode)) : 1.0,
        homeCurrency: homeCode,
        notes: notes.trim(),
        estimateCategory: resolveExpenseCategory(sheet, categories)
      },
      wantLink
    );

  };

  return (
    <ModalWrapper title={isEdit ? 'Edit Item' : 'Add Item'} wide onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field-row">
          <div className="field">
            <label>Sheet</label>
            <select value={sheet} onChange={e => setSheet(e.target.value)}>
              {sheets.map(s => (
                <option key={s.key} value={s.key}>
                  {s.key}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as any)}>
              <option value="idea">Idea</option>
              <option value="booked">Booked</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>Name</label>
          <input
            type="text"
            placeholder="e.g. Hotel Les Deux Girafes"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>

        {mode === 'dates' ? (
          <>
            <div className="field-row">
              <div className="field">
                <label>Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
              <div className="field">
                <label>End Date (optional, for stays)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label>Time (optional)</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
              />
            </div>
          </>
        ) : (
          <>
            <div className="field-row">
              <div className="field">
                <label>Day</label>
                <input
                  type="number"
                  min="1"
                  value={dayNumber}
                  onChange={e => setDayNumber(e.target.value)}
                />
              </div>
              <div className="field">
                <label>End Day (optional, for stays)</label>
                <input
                  type="number"
                  min="1"
                  value={dayNumberEnd}
                  onChange={e => setDayNumberEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label>Time (optional)</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="field">
          <label>Location (optional)</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="e.g. 10 Downing St, London or venue name…"
              value={location}
              onChange={e => {
                setLocation(e.target.value);
                if (locationFeedback) setLocationFeedback(null);
              }}
            />
            <button
              type="button"
              className="btn-ghost btn-sm"
              style={{ whiteSpace: 'nowrap', padding: '0 12px' }}
              disabled={isLocating || (!location.trim() && !name.trim())}
              onClick={handleFindPlanLocation}
              title="Search address & coordinates for map display"
            >
              {isLocating ? 'Locating…' : '📍 Find Address'}
            </button>
          </div>
          {locationFeedback && (
            <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)', marginTop: '4px' }}>
              {locationFeedback}
            </div>
          )}
        </div>

        <div className="field">
          <label>Links (optional)</label>
          {links.length > 0 ? (
            links.map(l => (
              <div className="link-row" key={l.id}>
                <input
                  type="text"
                  className="link-label"
                  placeholder="Label (optional)"
                  value={l.label}
                  onChange={e => handleUpdateLink(l.id, 'label', e.target.value)}
                />
                <input
                  type="text"
                  className="link-url"
                  placeholder="https://…"
                  value={l.url}
                  onChange={e => handleUpdateLink(l.id, 'url', e.target.value)}
                />
                <button
                  type="button"
                  className="exp-del link-remove"
                  onClick={() => handleRemoveLink(l.id)}
                  title="Remove link"
                >
                  ✕
                </button>
              </div>
            ))
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginBottom: '6px' }}>
              No links yet.
            </div>
          )}
          <button type="button" className="btn-ghost btn-sm" onClick={handleAddLink}>
            + Add Link
          </button>
        </div>

        {/* Currency Conversion Option */}
        <div style={{ margin: '10px 0', padding: '10px', background: 'var(--paper)', borderRadius: '6px', border: '1px solid var(--paper-edge)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0, fontWeight: 600, fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={useConversion}
                onChange={e => {
                  const on = e.target.checked;
                  setUseConversion(on);
                  if (on && !foreignCost && cost) {
                    setForeignCost(cost);
                  }
                }}
                style={{ width: 'auto' }}
              />
              💱 Convert from Foreign Currency
            </label>
            {useConversion && (
              <span style={{ fontSize: '11px', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                Home: {homeCode}
              </span>
            )}
          </div>

          {useConversion && (
            <div style={{ marginTop: '10px' }}>
              <div className="field-row">
                <div className="field">
                  <label>Expense Currency</label>
                  <select
                    value={currency}
                    onChange={e => {
                      const newCur = e.target.value;
                      setCurrency(newCur);
                      const newRate = getDefaultExchangeRate(newCur, homeCode);
                      setExchangeRate(String(newRate));
                      if (foreignCost) {
                        const f = parseFloat(foreignCost) || 0;
                        setCost(String(Math.round((f * newRate + Number.EPSILON) * 100) / 100));
                      }
                    }}
                  >
                    {SUPPORTED_CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code} — {c.name} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Amount in {currency}</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={foreignCost}
                    onChange={e => {
                      const val = e.target.value;
                      setForeignCost(val);
                      const f = parseFloat(val) || 0;
                      const r = parseFloat(exchangeRate) || getDefaultExchangeRate(currency, homeCode);
                      setCost(String(Math.round((f * r + Number.EPSILON) * 100) / 100));
                    }}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Exchange Rate (1 {currency} = X {homeCode})</label>
                  <input
                    type="number"
                    step="any"
                    value={exchangeRate}
                    onChange={e => {
                      const val = e.target.value;
                      setExchangeRate(val);
                      const r = parseFloat(val) || 0;
                      const f = parseFloat(foreignCost) || 0;
                      if (r > 0) {
                        setCost(String(Math.round((f * r + Number.EPSILON) * 100) / 100));
                      }
                    }}
                  />
                </div>
                <div className="field" style={{ alignSelf: 'flex-end', paddingBottom: '8px' }}>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => {
                      const r = getDefaultExchangeRate(currency, homeCode);
                      setExchangeRate(String(r));
                      const f = parseFloat(foreignCost) || 0;
                      setCost(String(Math.round((f * r + Number.EPSILON) * 100) / 100));
                    }}
                  >
                    Default Rate
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="field">
          <label>Cost in {homeCode} ({getCurrencyInfo(homeCode).symbol})</label>
          <input
            type="number"
            step="any"
            placeholder="0.00"
            value={cost}
            onChange={e => setCost(e.target.value)}
          />
        </div>


        <div className="field" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            id="modal-link-exp"
            style={{ width: 'auto' }}
            checked={wantLink}
            onChange={e => setWantLink(e.target.checked)}
          />
          <label htmlFor="modal-link-exp" style={{ margin: 0 }}>
            Also add this cost to the trip's expenses
          </label>
        </div>

        <div className="field">
          <label>Notes (optional)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            {isEdit ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

// 5. ResearchItemModal (with modern Google Places & Geocoding address search)
export const ResearchItemModal: React.FC<{
  sheets: Sheet[];
  existing?: ResearchItem | null;
  defaultSheet?: string;
  settings: Settings;
  onClose: () => void;
  onSave: (item: Partial<ResearchItem>) => void;
}> = ({ sheets, existing, defaultSheet, settings, onClose, onSave }) => {
  const isEdit = !!existing;

  const [sheet, setSheet] = useState(existing?.sheet || defaultSheet || sheets[0]?.key || 'Activities');
  const [status, setStatus] = useState<'researching' | 'shortlisted' | 'dismissed'>(
    existing?.status === 'promoted' ? 'researching' : existing?.status || 'researching'
  );
  const [name, setName] = useState(existing?.name || '');
  const [address, setAddress] = useState(existing?.address || '');
  const [priceLevel, setPriceLevel] = useState(existing?.priceLevel ? String(existing.priceLevel) : '');
  const [priority, setPriority] = useState(existing?.priority ? String(existing.priority) : '');
  const [estCost, setEstCost] = useState(existing?.estCost != null ? String(existing.estCost) : '');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [links, setLinks] = useState<LinkItem[]>(existing?.links || []);
  const [lat, setLat] = useState<number | null>(existing?.lat ?? null);
  const [lng, setLng] = useState<number | null>(existing?.lng ?? null);

  // Search & Places state
  const [searchResults, setSearchResults] = useState<ResolvedPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  const handleSearchPlaces = async (queryText: string) => {
    const q = queryText.trim();
    if (q.length < 2) return;
    setIsSearching(true);
    setSearchFeedback(null);
    try {
      const apiKey = getGoogleMapsApiKey(settings);
      const results = await searchPlaceOrAddress(q, apiKey);
      setSearchResults(results);
      setShowDropdown(true);
      if (results.length === 0) {
        setSearchFeedback('No matching address found. You can type an address manually below.');
      }
    } catch (_) {
      setSearchFeedback('Could not fetch address details.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPlace = (place: ResolvedPlace) => {
    if (place.name && place.name !== name) {
      setName(place.name);
    }
    setAddress(place.address);
    setLat(place.lat);
    setLng(place.lng);
    if (place.website) {
      const exists = links.some(l => l.url === place.website);
      if (!exists) {
        setLinks(prev => [...prev, { id: uid('link'), label: 'Official Website', url: place.website! }]);
      }
    }
    setShowDropdown(false);
    setSearchFeedback(`Found: ${place.address}`);
  };

  const handleGeocodeAddress = async () => {
    if (!address.trim()) return;
    setIsSearching(true);
    try {
      const apiKey = getGoogleMapsApiKey(settings);
      const results = await searchPlaceOrAddress(address.trim(), apiKey);
      if (results.length > 0) {
        handleSelectPlace(results[0]);
      } else {
        setSearchFeedback('Address could not be located on the map.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddLink = () => {
    setLinks([...links, { id: uid('link'), label: '', url: '' }]);
  };

  const handleUpdateLink = (id: string, field: 'label' | 'url', val: string) => {
    setLinks(links.map(l => (l.id === id ? { ...l, [field]: val } : l)));
  };

  const handleRemoveLink = (id: string) => {
    setLinks(links.filter(l => l.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      sheet,
      status,
      name: singleLine(name),
      address: singleLine(address),
      lat,
      lng,
      priceLevel: priceLevel ? Number(priceLevel) : null,
      priority: priority ? Number(priority) : null,
      estCost: estCost === '' ? null : Math.max(0, Number(estCost) || 0),
      links: links.filter(l => l.url.trim()),
      notes: notes.trim()
    });
  };

  return (
    <ModalWrapper title={isEdit ? 'Edit Place' : 'Add Place'} wide onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field-row">
          <div className="field">
            <label>Sheet</label>
            <select value={sheet} onChange={e => setSheet(e.target.value)}>
              {sheets.map(s => (
                <option key={s.key} value={s.key}>
                  {s.key}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as any)}>
              <option value="researching">Researching</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
        </div>

        <div className="field" style={{ position: 'relative' }}>
          <label>Name / Search</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Search place name or destination (e.g. Louvre, Dishoom Shoreditch)…"
              value={name}
              onChange={e => {
                setName(e.target.value);
                if (showDropdown) setShowDropdown(false);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchPlaces(name);
                }
              }}
              autoFocus
            />
            <button
              type="button"
              className="btn-primary btn-sm"
              style={{ whiteSpace: 'nowrap', padding: '0 14px' }}
              disabled={isSearching || !name.trim()}
              onClick={() => handleSearchPlaces(name)}
            >
              {isSearching ? 'Searching…' : '🔍 Find Address'}
            </button>
          </div>

          {/* Autocomplete / Search Results dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 50,
                background: 'var(--paper-raised)',
                border: '1px solid var(--paper-edge)',
                borderRadius: '6px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                maxHeight: '220px',
                overflowY: 'auto',
                marginTop: '4px'
              }}
            >
              <div style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--ink-soft)', borderBottom: '1px solid var(--line)', background: 'var(--paper)' }}>
                Select matching place to autofill address &amp; map coordinates:
              </div>
              {searchResults.map((res, i) => (
                <div
                  key={i}
                  onClick={() => handleSelectPlace(res)}
                  style={{
                    padding: '8px 12px',
                    borderBottom: i < searchResults.length - 1 ? '1px solid var(--line)' : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--paper)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>
                    📍 {res.name}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)', marginTop: '2px' }}>
                    {res.address}
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchFeedback && (
            <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)', marginTop: '4px', fontStyle: 'italic' }}>
              {searchFeedback}
            </div>
          )}
        </div>

        <div className="field">
          <label>Address</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Autofills from place search, or enter address manually"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
            <button
              type="button"
              className="btn-ghost btn-sm"
              style={{ whiteSpace: 'nowrap', padding: '0 12px' }}
              disabled={isSearching || !address.trim()}
              onClick={handleGeocodeAddress}
              title="Locate coordinates for this address"
            >
              📍 Locate
            </button>
          </div>
        </div>

        {/* Pinned Map Coordinate Banner */}
        {lat != null && lng != null && (
          <div
            style={{
              padding: '8px 12px',
              background: '#eef6f3',
              border: '1px solid #35695c',
              borderRadius: '6px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#1c2530'
            }}
          >
            <span>
              ✅ <strong>Mapped Coordinates:</strong> {lat.toFixed(5)}, {lng.toFixed(5)} — Will display marker on map
            </span>
            <button
              type="button"
              className="btn-ghost btn-sm"
              style={{ fontSize: '10.5px', padding: '2px 8px' }}
              onClick={() => {
                setLat(null);
                setLng(null);
              }}
            >
              Clear Pin
            </button>
          </div>
        )}

        <div className="field-row">
          <div className="field">
            <label>Price Level</label>
            <select value={priceLevel} onChange={e => setPriceLevel(e.target.value)}>
              <option value="">Not sure</option>
              <option value="1">£</option>
              <option value="2">££</option>
              <option value="3">£££</option>
              <option value="4">££££</option>
            </select>
          </div>
          <div className="field">
            <label>Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="">Not set</option>
              <option value="1">★</option>
              <option value="2">★★</option>
              <option value="3">★★★</option>
              <option value="4">★★★★</option>
              <option value="5">★★★★★</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>Estimated Cost (optional, {CUR})</label>
          <input
            type="number"
            step="any"
            value={estCost}
            onChange={e => setEstCost(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Links (optional)</label>
          {links.length > 0 ? (
            links.map(l => (
              <div className="link-row" key={l.id}>
                <input
                  type="text"
                  className="link-label"
                  placeholder="Label (optional)"
                  value={l.label}
                  onChange={e => handleUpdateLink(l.id, 'label', e.target.value)}
                />
                <input
                  type="text"
                  className="link-url"
                  placeholder="https://…"
                  value={l.url}
                  onChange={e => handleUpdateLink(l.id, 'url', e.target.value)}
                />
                <button
                  type="button"
                  className="exp-del link-remove"
                  onClick={() => handleRemoveLink(l.id)}
                  title="Remove link"
                >
                  ✕
                </button>
              </div>
            ))
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginBottom: '6px' }}>
              No links yet.
            </div>
          )}
          <button type="button" className="btn-ghost btn-sm" onClick={handleAddLink}>
            + Add Link
          </button>
        </div>

        <div className="field">
          <label>Why interested (optional)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            {isEdit ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

// 6. PackingItemModal
export const PackingItemModal: React.FC<{
  defaultCategory?: string;
  onClose: () => void;
  onSave: (item: { name: string; category: string; qty: number }) => void;
}> = ({ defaultCategory, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(defaultCategory || PACKING_CATEGORIES[0].key);
  const [qty, setQty] = useState('1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: singleLine(name),
      category,
      qty: Math.max(1, Number(qty) || 1)
    });
  };

  return (
    <ModalWrapper title="Add Packing Item" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Item</label>
          <input
            type="text"
            placeholder="e.g. Passport"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {PACKING_CATEGORIES.map(c => (
                <option key={c.key} value={c.key}>
                  {c.key}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Qty</label>
            <input
              type="number"
              min="1"
              step="1"
              value={qty}
              onChange={e => setQty(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Add Item
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

// 7. CategoriesModal
export const CategoriesModal: React.FC<{
  categories: Category[];
  trips: Trip[];
  onClose: () => void;
  onUpdateCategories: (categories: Category[]) => void;
  onShowToast: (msg: string) => void;
}> = ({ categories, trips, onClose, onUpdateCategories, onShowToast }) => {
  const [catList, setCatList] = useState<Category[]>(categories);

  const handleColorChange = (idx: number, color: string) => {
    const updated = [...catList];
    updated[idx].color = color;
    setCatList(updated);
    onUpdateCategories(updated);
  };

  const handleNameChange = (idx: number, newName: string) => {
    const updated = [...catList];
    updated[idx].name = singleLine(newName) || updated[idx].name;
    setCatList(updated);
    onUpdateCategories(updated);
  };

  const handleDelete = (idx: number) => {
    const cat = catList[idx];
    const affected = trips.reduce(
      (n, t) => n + t.expenses.filter(e => e.category === cat.name).length,
      0
    );
    const msg = affected
      ? `Delete "${cat.name}"? ${affected} expense(s) using it will be moved to "Other".`
      : `Delete "${cat.name}"?`;
    if (!window.confirm(msg)) return;

    const updated = catList.filter((_, i) => i !== idx);
    setCatList(updated);
    onUpdateCategories(updated);
    onShowToast(`Deleted "${cat.name}"`);
  };

  const handleAddCategory = () => {
    const newCat = { name: 'New Category', color: '#6a4a6e' };
    const updated = [...catList];
    updated.splice(updated.length - 1, 0, newCat);
    setCatList(updated);
    onUpdateCategories(updated);
  };

  return (
    <ModalWrapper title="Manage Categories" wide onClose={onClose}>
      <div style={{ marginBottom: '16px' }}>
        {catList.map((c, i) => (
          <div className="cat-row" key={i}>
            <input
              type="color"
              className="cat-color"
              value={c.color}
              onChange={e => handleColorChange(i, e.target.value)}
            />
            <input
              type="text"
              value={c.name}
              onChange={e => handleNameChange(i, e.target.value)}
              disabled={c.name === 'Other'}
            />
            {c.name !== 'Other' ? (
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => handleDelete(i)}
              >
                Delete
              </button>
            ) : (
              <span style={{ width: '64px', display: 'inline-block' }} />
            )}
          </div>
        ))}
      </div>

      <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
        <button type="button" className="btn-ghost btn-sm" onClick={handleAddCategory}>
          + Add Category
        </button>
        <button type="button" className="btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </ModalWrapper>
  );
};

// 8. ManageSheetsModal
export const ManageSheetsModal: React.FC<{
  trip?: Trip | null;
  sheets: Sheet[];
  onClose: () => void;
  onUpdateSheets: (sheets: Sheet[]) => void;
  onUpdateTripHiddenSheets?: (hidden: string[]) => void;
  onShowToast: (msg: string) => void;
}> = ({
  trip,
  sheets,
  onClose,
  onUpdateSheets,
  onUpdateTripHiddenSheets,
  onShowToast
}) => {
  const [sheetList, setSheetList] = useState<Sheet[]>(sheets);

  const handleMove = (idx: number, direction: number) => {
    const target = idx + direction;
    if (target < 0 || target >= sheetList.length) return;
    const updated = [...sheetList];
    const [moved] = updated.splice(idx, 1);
    updated.splice(target, 0, moved);
    setSheetList(updated);
    onUpdateSheets(updated);
  };

  const handleColorChange = (idx: number, color: string) => {
    const updated = [...sheetList];
    updated[idx].color = color;
    setSheetList(updated);
    onUpdateSheets(updated);
  };

  const handleNameChange = (idx: number, newKey: string) => {
    const oldKey = sheetList[idx].key;
    const clean = singleLine(newKey) || oldKey;
    if (clean !== oldKey && sheetList.some((s, j) => j !== idx && s.key === clean)) {
      onShowToast('A category with that name already exists');
      return;
    }
    const updated = [...sheetList];
    updated[idx].key = clean;
    setSheetList(updated);
    onUpdateSheets(updated);
  };

  const handleToggleTripVisibility = (key: string, checked: boolean) => {
    if (!trip || !onUpdateTripHiddenSheets) return;
    let hidden = trip.hiddenSheets || [];
    if (checked) {
      hidden = hidden.filter(k => k !== key);
    } else if (!hidden.includes(key)) {
      hidden = [...hidden, key];
    }
    onUpdateTripHiddenSheets(hidden);
  };

  const handleDelete = (idx: number) => {
    if (sheetList.length <= 1) {
      onShowToast('Keep at least one category');
      return;
    }
    const s = sheetList[idx];
    if (!window.confirm(`Delete "${s.key}" category?`)) return;
    const updated = sheetList.filter((_, i) => i !== idx);
    setSheetList(updated);
    onUpdateSheets(updated);
    onShowToast(`Deleted "${s.key}"`);
  };

  const handleAdd = () => {
    let name = 'New Category';
    let n = 2;
    while (sheetList.some(s => s.key === name)) {
      name = `New Category ${n}`;
      n++;
    }
    const updated = [...sheetList, { key: name, color: '#6a4a6e' }];
    setSheetList(updated);
    onUpdateSheets(updated);
  };

  return (
    <ModalWrapper title="Manage Plan & Research Categories" wide onClose={onClose}>
      <p style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: '-6px' }}>
        These sections show in both Plan and Research.
        {trip ? ` The "Show" checkbox controls visibility just for ${trip.name}.` : ''}
      </p>

      <div style={{ marginBottom: '16px' }}>
        {sheetList.map((s, i) => (
          <div className="cat-row" key={s.key + i}>
            <div className="reorder-btns">
              <button
                type="button"
                className="reorder-btn"
                disabled={i === 0}
                onClick={() => handleMove(i, -1)}
                title="Move up"
              >
                ▲
              </button>
              <button
                type="button"
                className="reorder-btn"
                disabled={i === sheetList.length - 1}
                onClick={() => handleMove(i, 1)}
                title="Move down"
              >
                ▼
              </button>
            </div>
            <input
              type="color"
              className="sheet-color"
              value={s.color}
              onChange={e => handleColorChange(i, e.target.value)}
            />
            <input
              type="text"
              value={s.key}
              onChange={e => handleNameChange(i, e.target.value)}
            />
            {trip && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  color: 'var(--ink-soft)',
                  whiteSpace: 'nowrap'
                }}
              >
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={!trip.hiddenSheets.includes(s.key)}
                  onChange={e => handleToggleTripVisibility(s.key, e.target.checked)}
                />
                Show
              </label>
            )}
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => handleDelete(i)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
        <button type="button" className="btn-ghost btn-sm" onClick={handleAdd}>
          + Add Category
        </button>
        <button type="button" className="btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </ModalWrapper>
  );
};

// 9. ReorderTabsModal (with full enable/disable customizability)
export const ReorderTabsModal: React.FC<{
  tabOrder: string[];
  disabledTabs?: string[];
  onClose: () => void;
  onUpdateTabOrder: (order: string[]) => void;
  onUpdateDisabledTabs?: (disabled: string[]) => void;
}> = ({
  tabOrder,
  disabledTabs = ['attire', 'hauls'],
  onClose,
  onUpdateTabOrder,
  onUpdateDisabledTabs
}) => {
  const allTabs = Object.keys(TRIP_TAB_LABELS);
  const fullOrder = [...tabOrder];
  allTabs.forEach(k => {
    if (!fullOrder.includes(k)) fullOrder.push(k);
  });

  const [order, setOrder] = useState<string[]>(fullOrder);
  const [disabled, setDisabled] = useState<string[]>(disabledTabs);

  const handleMove = (idx: number, direction: number) => {
    const target = idx + direction;
    if (target < 0 || target >= order.length) return;
    const copy = [...order];
    const [moved] = copy.splice(idx, 1);
    copy.splice(target, 0, moved);
    setOrder(copy);
    onUpdateTabOrder(copy);
  };

  const handleToggleTab = (key: string) => {
    const isCurrentlyDisabled = disabled.includes(key);
    let nextDisabled: string[];
    if (isCurrentlyDisabled) {
      nextDisabled = disabled.filter(k => k !== key);
    } else {
      if (order.filter(k => !disabled.includes(k)).length <= 1) {
        return;
      }
      nextDisabled = [...disabled, key];
    }
    setDisabled(nextDisabled);
    if (onUpdateDisabledTabs) {
      onUpdateDisabledTabs(nextDisabled);
    }
  };

  const applyPreset = (preset: 'standard' | 'all' | 'minimal') => {
    let nextDisabled: string[] = [];
    if (preset === 'standard') {
      nextDisabled = ['attire', 'hauls'];
    } else if (preset === 'all') {
      nextDisabled = [];
    } else if (preset === 'minimal') {
      nextDisabled = ['charts', 'research', 'posttrip', 'attire', 'hauls'];
    }
    setDisabled(nextDisabled);
    if (onUpdateDisabledTabs) {
      onUpdateDisabledTabs(nextDisabled);
    }
  };

  const TAB_DESCRIPTIONS: Record<string, string> = {
    budget: 'Financial accounting, planned vs actual spend, category breakdown',
    charts: 'Visual analytics, category burn rates, and budget graphs',
    plan: 'Hour-by-hour itinerary, scheduled items, and interactive map',
    research: 'Places discovered, notes, ratings, and places map',
    posttrip: 'Visited places checklist and completion records',
    packing: 'Packing lists and baggage essentials tracker',
    attire: 'Luggage manifests and outfit wardrobe planner',
    hauls: 'Lounges visited and duty-free specialty hauls diary'
  };

  return (
    <ModalWrapper title="Customize & Reorder Tabs" wide onClose={onClose}>
      <p style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: '-6px' }}>
        Enable or disable tabs to tailor your travel ledger. Use arrows to change display order.
      </p>

      {/* Quick Presets */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
          Presets:
        </span>
        <button
          type="button"
          className="btn-ghost btn-sm"
          style={{ fontSize: '11px', padding: '3px 8px' }}
          onClick={() => applyPreset('standard')}
          title="Enable standard travel ledger tabs (disable attire & hauls)"
        >
          Standard Ledger (Recommended)
        </button>
        <button
          type="button"
          className="btn-ghost btn-sm"
          style={{ fontSize: '11px', padding: '3px 8px' }}
          onClick={() => applyPreset('all')}
          title="Enable all available modules"
        >
          All Modules
        </button>
        <button
          type="button"
          className="btn-ghost btn-sm"
          style={{ fontSize: '11px', padding: '3px 8px' }}
          onClick={() => applyPreset('minimal')}
          title="Only Budget, Plan & Packing"
        >
          Core Only
        </button>
      </div>

      <div style={{ marginBottom: '16px', maxHeight: '55vh', overflowY: 'auto' }}>
        {order.map((key, i) => {
          const isEnabled = !disabled.includes(key);
          const isOptional = key === 'attire' || key === 'hauls';

          return (
            <div
              className="cat-row"
              key={key}
              style={{
                opacity: isEnabled ? 1 : 0.65,
                background: isEnabled ? 'var(--paper-raised)' : 'transparent',
                border: '1px solid var(--paper-edge)',
                borderRadius: '6px',
                padding: '8px 10px',
                marginBottom: '6px'
              }}
            >
              <div className="reorder-btns">
                <button
                  type="button"
                  className="reorder-btn"
                  disabled={i === 0}
                  onClick={() => handleMove(i, -1)}
                  title="Move up"
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="reorder-btn"
                  disabled={i === order.length - 1}
                  onClick={() => handleMove(i, 1)}
                  title="Move down"
                >
                  ▼
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, marginLeft: '6px' }}>
                <input
                  type="checkbox"
                  id={`tab-chk-${key}`}
                  checked={isEnabled}
                  onChange={() => handleToggleTab(key)}
                  style={{ width: 'auto', cursor: 'pointer' }}
                />
                <label
                  htmlFor={`tab-chk-${key}`}
                  style={{ margin: 0, cursor: 'pointer', flex: 1 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>
                      {TRIP_TAB_LABELS[key] || key}
                    </span>
                    {isOptional && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontFamily: 'var(--font-mono)',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          background: isEnabled ? 'var(--brass)' : 'var(--line)',
                          color: isEnabled ? '#fff' : 'var(--ink-soft)'
                        }}
                      >
                        {isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-soft)', marginTop: '1px' }}>
                    {TAB_DESCRIPTIONS[key] || 'Trip navigation tab'}
                  </div>
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <div className="modal-actions">
        <button type="button" className="btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </ModalWrapper>
  );
};

// 10. TrashModal
export const TrashModal: React.FC<{
  trash: TrashState;
  onClose: () => void;
  onRestoreTrip: (idx: number) => void;
  onRestoreExpense: (idx: number) => void;
  onEmptyTrash: () => void;
}> = ({ trash, onClose, onRestoreTrip, onRestoreExpense, onEmptyTrash }) => {
  const empty = trash.trips.length === 0 && trash.expenses.length === 0;

  return (
    <ModalWrapper title="Trash" wide onClose={onClose}>
      <div style={{ maxHeight: '50vh', overflowY: 'auto', marginBottom: '16px' }}>
        {empty ? (
          <div className="empty-state">Trash is empty.</div>
        ) : (
          <>
            {trash.trips.map((t, idx) => (
              <div className="trash-item" key={t.id + idx}>
                <span>
                  Trip: <strong>{t.name}</strong> ({t.year})
                </span>
                <span>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => onRestoreTrip(idx)}
                    style={{ marginRight: '8px' }}
                  >
                    Restore
                  </button>
                  <span className="ts">{new Date(t.deletedAt).toLocaleDateString('en-GB')}</span>
                </span>
              </div>
            ))}

            {trash.expenses.map((item, idx) => (
              <div className="trash-item" key={item.id + idx}>
                <span>
                  Expense: <strong>{item.expense.description}</strong> — from {item.tripName}
                </span>
                <span>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => onRestoreExpense(idx)}
                    style={{ marginRight: '8px' }}
                  >
                    Restore
                  </button>
                  <span className="ts">{new Date(item.deletedAt).toLocaleDateString('en-GB')}</span>
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="modal-actions">
        {!empty && (
          <button type="button" className="btn-danger" onClick={onEmptyTrash} style={{ marginRight: 'auto' }}>
            Empty Trash
          </button>
        )}
        <button type="button" className="btn-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </ModalWrapper>
  );
};

// 11. ActivityLogModal
export const ActivityLogModal: React.FC<{
  log: ActivityLogItem[];
  onClose: () => void;
}> = ({ log, onClose }) => {
  return (
    <ModalWrapper title="Activity Log" wide onClose={onClose}>
      <div style={{ maxHeight: '50vh', overflowY: 'auto', marginBottom: '16px' }}>
        {log.length === 0 ? (
          <div className="empty-state">No activity yet.</div>
        ) : (
          log.slice(0, 100).map(item => (
            <div className="log-item" key={item.id}>
              <span>{item.detail}</span>
              <span className="ts">{new Date(item.ts).toLocaleString('en-GB')}</span>
            </div>
          ))
        )}
      </div>
      <div className="modal-actions">
        <button type="button" className="btn-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </ModalWrapper>
  );
};

// 12. BackupHistoryModal
export const BackupHistoryModal: React.FC<{
  history: HistoryEntry[];
  onClose: () => void;
  onRestoreHistory: (entry: HistoryEntry) => void;
}> = ({ history, onClose, onRestoreHistory }) => {
  return (
    <ModalWrapper title="Backup History" wide onClose={onClose}>
      <p style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: '-6px' }}>
        A snapshot is kept automatically once per day (last 14 days kept). Restoring replaces your current trips, categories, and packing lists — your current data is moved to Trash first.
      </p>

      <div style={{ maxHeight: '50vh', overflowY: 'auto', marginBottom: '16px' }}>
        {history.length === 0 ? (
          <div className="empty-state">
            No snapshots yet — one is saved automatically the first time you make a change today.
          </div>
        ) : (
          history.map(entry => {
            let count = '?';
            try {
              count = JSON.parse(entry.snapshot).trips.length;
            } catch (_) {}

            return (
              <div className="cat-row" key={entry.dateKey}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{entry.dateKey}</div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(entry.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · {count} trip(s)
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => onRestoreHistory(entry)}
                >
                  Restore
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="modal-actions">
        <button type="button" className="btn-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </ModalWrapper>
  );
};

// 13. GithubSyncModal
export const GithubSyncModal: React.FC<{
  settings: Settings;
  onClose: () => void;
  onSaveSettings: (settings: Settings) => void;
  onPushNow: () => Promise<void>;
  onPullNow: () => Promise<void>;
}> = ({ settings, onClose, onSaveSettings, onPushNow, onPullNow }) => {
  const [enabled, setEnabled] = useState(settings.githubEnabled);
  const [token, setToken] = useState(settings.githubToken);
  const [owner, setOwner] = useState(settings.githubOwner);
  const [repo, setRepo] = useState(settings.githubRepo);
  const [path, setPath] = useState(settings.githubPath || 'data.json');
  const [branch, setBranch] = useState(settings.githubBranch || 'main');
  const [statusMsg, setStatusMsg] = useState(
    !settings.githubEnabled
      ? 'Sync is off.'
      : !settings.githubToken
      ? 'Enabled, but no token saved yet.'
      : settings.githubLastSyncAt
      ? `Last synced: ${new Date(settings.githubLastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : 'Ready to sync.'
  );

  const [testResult, setTestResult] = useState<GithubTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await githubTestConnection({
        ...settings,
        githubEnabled: enabled,
        githubToken: token.trim(),
        githubOwner: singleLine(owner),
        githubRepo: singleLine(repo),
        githubPath: singleLine(path) || 'data.json',
        githubBranch: singleLine(branch) || 'main'
      });
      setTestResult(res);
      if (res.ok) {
        setStatusMsg('Connection verified successfully!');
      } else {
        setStatusMsg(res.message);
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        repoExists: false,
        canWrite: false,
        branchExists: false,
        fileExists: false,
        message: err.message || 'Connection test failed',
        checks: [{ name: 'Test execution', passed: false, note: err.message || 'Unexpected failure' }]
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSaveSettings({
      ...settings,
      githubEnabled: enabled,
      githubToken: token.trim(),
      githubOwner: singleLine(owner),
      githubRepo: singleLine(repo),
      githubPath: singleLine(path) || 'data.json',
      githubBranch: singleLine(branch) || 'main'
    });
    onClose();
  };

  const handlePush = async () => {
    setStatusMsg('Pushing…');
    try {
      await onPushNow();
      setStatusMsg('Pushed successfully just now.');
    } catch (err: any) {
      setStatusMsg(githubUserError('push', err));
    }
  };

  const handlePull = async () => {
    setStatusMsg('Pulling latest copy…');
    try {
      await onPullNow();
      setStatusMsg('Pulled successfully just now.');
    } catch (err: any) {
      setStatusMsg(githubUserError('pull', err));
    }
  };

  return (
    <ModalWrapper title="GitHub Sync & Diagnostics" wide onClose={onClose}>
      <div className="field" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="checkbox"
          id="gh-enable-chk"
          style={{ width: 'auto' }}
          checked={enabled}
          onChange={e => setEnabled(e.target.checked)}
        />
        <label htmlFor="gh-enable-chk" style={{ margin: 0 }}>
          Enable automatic sync to GitHub
        </label>
      </div>

      <div className="field">
        <label>Personal Access Token (Classic or Fine-grained)</label>
        <input
          type="password"
          placeholder="ghp_… or github_pat_…"
          value={token}
          onChange={e => setToken(e.target.value)}
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label>Repo Owner</label>
          <input
            type="text"
            placeholder="e.g. Ello2003"
            value={owner}
            onChange={e => setOwner(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Repo Name</label>
          <input
            type="text"
            placeholder="e.g. travel-ledger"
            value={repo}
            onChange={e => setRepo(e.target.value)}
          />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>File Path</label>
          <input
            type="text"
            value={path}
            onChange={e => setPath(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Branch</label>
          <input
            type="text"
            value={branch}
            onChange={e => setBranch(e.target.value)}
          />
        </div>
      </div>

      {/* Diagnostics & Test Connection Section */}
      <div style={{ marginTop: '10px', marginBottom: '14px' }}>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={handleTestConnection}
          disabled={isTesting || !token.trim() || !owner.trim() || !repo.trim()}
          style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          {isTesting ? 'Testing connection…' : '🧪 Test GitHub Connection & Diagnostics'}
        </button>

        {testResult && (
          <div
            style={{
              marginTop: '10px',
              padding: '10px 12px',
              background: testResult.ok ? 'rgba(53, 105, 92, 0.08)' : 'rgba(166, 58, 46, 0.08)',
              border: `1px solid ${testResult.ok ? 'var(--green)' : 'var(--red)'}`,
              borderRadius: '6px',
              fontSize: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: testResult.ok ? 'var(--green)' : 'var(--red)', marginBottom: '6px' }}>
              <span>{testResult.ok ? '✅' : '⚠️'}</span>
              <span>{testResult.ok ? 'GitHub Ready' : 'Configuration Issue'}</span>
            </div>
            <p style={{ margin: '0 0 8px', fontSize: '11.5px', color: 'var(--ink)' }}>
              {testResult.message}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {testResult.checks.map((chk, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                  <span>{chk.passed ? '✓' : '✗'}</span>
                  <span style={{ fontWeight: 600 }}>{chk.name}:</span>
                  <span style={{ color: chk.passed ? 'var(--ink)' : 'var(--red)' }}>{chk.note}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p style={{ fontSize: '11.5px', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)', margin: '6px 0' }}>
        {statusMsg}
      </p>

      <p style={{ fontSize: '11px', color: 'var(--ink-soft)', lineHeight: 1.5, margin: '6px 0 12px' }}>
        <strong>Token Requirements:</strong> For fine-grained tokens, select this repository in <em>Repository Access</em> and grant <strong>Contents: Read and write</strong>. For classic tokens, check the <code>repo</code> scope.
      </p>

      <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button type="button" className="btn-ghost" onClick={handlePush}>
            Push Now
          </button>
          <button type="button" className="btn-ghost" onClick={handlePull}>
            Pull Now
          </button>
          <button type="button" className="btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};

// 13.5. SettingsModal (Feature Customisation & Global Preferences)
export const SettingsModal: React.FC<{
  settings: Settings;
  onClose: () => void;
  onSaveSettings: (settings: Settings) => void;
  onOpenReorderTabs?: () => void;
  onOpenGithubSync?: () => void;
  onOpenBackupManager?: () => void;
}> = ({
  settings,
  onClose,
  onSaveSettings,
  onOpenReorderTabs,
  onOpenGithubSync,
  onOpenBackupManager
}) => {
  const [form, setForm] = useState<Settings>({ ...settings });

  const handleToggle = (key: keyof Settings) => {
    setForm(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    onSaveSettings(form);
    onClose();
  };

  return (
    <ModalWrapper title="Settings & Feature Customisation" wide onClose={onClose}>
      <div style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>

        {/* Section 1: Boarding Pass Cards */}
        <div style={{ marginBottom: '18px', padding: '12px 14px', background: 'var(--paper)', border: '1px solid var(--paper-edge)', borderRadius: '6px' }}>
          <h4 style={{ margin: '0 0 10px', fontSize: '13.5px', fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
            🎫 Boarding Pass Cards (Dashboard)
          </h4>
          <p style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: 0, marginBottom: '12px' }}>
            Choose which badge indicators appear on your luxury boarding pass cards.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={!!form.showHaulBadges}
                onChange={() => handleToggle('showHaulBadges')}
              />
              <span>Show Lounge &amp; Haul Badges (<span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>✨ N hauls/lounges</span>)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={!!form.showAttireBadges}
                onChange={() => handleToggle('showAttireBadges')}
              />
              <span>Show Wardrobe / Attire Badges (<span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>👔 N looks</span>)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={!!form.showLuggageBadges}
                onChange={() => handleToggle('showLuggageBadges')}
              />
              <span>Show Luggage Bags Badges (<span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>💼 N bags</span>)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={form.showCountdownBadge !== false}
                onChange={() => handleToggle('showCountdownBadge')}
              />
              <span>Show Departure Countdown Chip (<span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>In 5d</span>)</span>
            </label>
          </div>
        </div>

        {/* Section 2: Dashboard & Itinerary Modules */}
        <div style={{ marginBottom: '18px', padding: '12px 14px', background: 'var(--paper)', border: '1px solid var(--paper-edge)', borderRadius: '6px' }}>
          <h4 style={{ margin: '0 0 10px', fontSize: '13.5px', fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
            🧭 Dashboard &amp; Display Modules
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={form.showUpNextStrip !== false}
                onChange={() => handleToggle('showUpNextStrip')}
              />
              <span>Show "Up Next" upcoming activities strip on dashboard</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={!!form.defaultShowArchived}
                onChange={() => handleToggle('defaultShowArchived')}
              />
              <span>Always show Archived trips by default on dashboard</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={form.showItineraryMap !== false}
                onChange={() => handleToggle('showItineraryMap')}
              />
              <span>Enable Itinerary Route Map banner</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={form.showResearchMap !== false}
                onChange={() => handleToggle('showResearchMap')}
              />
              <span>Enable Research Places Map view</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={form.enableCurrencyConverter !== false}
                onChange={() => handleToggle('enableCurrencyConverter')}
              />
              <span>Enable Multi-Currency Converter &amp; Exchange rate calculations</span>
            </label>
          </div>

          {onOpenReorderTabs && (
            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => {
                  onClose();
                  onOpenReorderTabs();
                }}
              >
                ⚙️ Customize &amp; Reorder Itinerary Tabs
              </button>
            </div>
          )}
        </div>

        {/* Section 3: Financial Defaults */}
        <div style={{ marginBottom: '18px', padding: '12px 14px', background: 'var(--paper)', border: '1px solid var(--paper-edge)', borderRadius: '6px' }}>
          <h4 style={{ margin: '0 0 10px', fontSize: '13.5px', fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
            💱 Currency &amp; Finance Defaults
          </h4>
          <div className="field" style={{ margin: 0 }}>
            <label>Default Ledger Home Currency</label>
            <select
              value={form.homeCurrency || 'GBP'}
              onChange={e => setForm(prev => ({ ...prev, homeCurrency: e.target.value }))}
            >
              {SUPPORTED_CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} — {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 4: Google Maps Key */}
        <div style={{ marginBottom: '18px', padding: '12px 14px', background: 'var(--paper)', border: '1px solid var(--paper-edge)', borderRadius: '6px' }}>
          <h4 style={{ margin: '0 0 10px', fontSize: '13.5px', fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
            🗺️ Google Maps Platform Configuration
          </h4>
          <div className="field" style={{ margin: 0 }}>
            <label>Custom Google Maps API Key (Optional)</label>
            <input
              type="text"
              placeholder="AIzaSy… (Leave empty to use provisioned Cloud Demo Key)"
              value={form.mapsApiKey || ''}
              onChange={e => setForm(prev => ({ ...prev, mapsApiKey: e.target.value }))}
            />
            <div style={{ fontSize: '11px', color: 'var(--ink-soft)', marginTop: '4px' }}>
              {form.mapsApiKey ? 'Using custom API key' : 'Active: Provisioned Google Cloud Demo Key with Places & Geocoding'}
            </div>
          </div>
        </div>

        {/* Section 5: Integrations Shortcuts */}
        <div style={{ padding: '12px 14px', background: 'var(--paper)', border: '1px solid var(--paper-edge)', borderRadius: '6px' }}>
          <h4 style={{ margin: '0 0 10px', fontSize: '13.5px', fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
            ☁️ Cloud Storage &amp; Sync
          </h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {onOpenBackupManager && (
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => {
                  onClose();
                  onOpenBackupManager();
                }}
              >
                💾 Backup &amp; Recovery Manager
              </button>
            )}
            {onOpenGithubSync && (
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => {
                  onClose();
                  onOpenGithubSync();
                }}
              >
                🐙 GitHub Sync Settings
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={handleSave}>
          Save Settings
        </button>
      </div>
    </ModalWrapper>
  );
};

// 14. MapSettingsModal
export const MapSettingsModal: React.FC<{
  apiKey: string;
  onClose: () => void;
  onSave: (key: string) => void;
}> = ({ apiKey, onClose, onSave }) => {
  const [key, setKey] = useState(apiKey || '');

  return (
    <ModalWrapper title="Map Settings" onClose={onClose}>
      <div className="field">
        <label>Google Maps API Key</label>
        <input
          type="text"
          placeholder="AIza…"
          value={key}
          onChange={e => setKey(e.target.value)}
          autoFocus
        />
      </div>
      <p style={{ fontSize: '12px', color: 'var(--ink-soft)', lineHeight: 1.5 }}>
        Free to create in Google Cloud Console. Enable Maps JavaScript API and Places API. The key is saved in this browser only.
      </p>
      <div className="modal-actions">
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={() => onSave(key.trim())}>
          Save
        </button>
      </div>
    </ModalWrapper>
  );
};

// 15. ChangelogModal
export const ChangelogModal: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const versions = Object.keys(CHANGELOG).sort((a, b) =>
    b.localeCompare(a, undefined, { numeric: true })
  );

  return (
    <ModalWrapper title="Version History" wide onClose={onClose}>
      <div style={{ maxHeight: '55vh', overflowY: 'auto', marginBottom: '16px' }}>
        {versions.map(v => (
          <div className="log-item" key={v}>
            <span>
              <strong>v{v}</strong> — {CHANGELOG[v]}
            </span>
          </div>
        ))}
      </div>
      <div className="modal-actions">
        <button type="button" className="btn-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </ModalWrapper>
  );
};
