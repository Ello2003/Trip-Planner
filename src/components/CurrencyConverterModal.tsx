import React, { useState, useEffect, useMemo } from 'react';
import { Trip, Settings, SUPPORTED_CURRENCIES } from '../types';
import {
  getCurrencyInfo,
  getDefaultExchangeRate,
  convertCurrency,
  formatCurrencyAmount,
  fetchLiveRates
} from '../utils/currency';
import { ModalWrapper } from './Modals';

interface CurrencyConverterModalProps {
  trip?: Trip | null;
  settings: Settings;
  onClose: () => void;
  onUpdateTrip?: (updated: Trip, logAction?: { action: string; detail: string }) => void;
  onSaveSettings?: (settings: Settings) => void;
  initialFromCurrency?: string;
  initialAmount?: number;
  onApplyConversion?: (result: {
    foreignAmount: number;
    foreignCurrency: string;
    homeAmount: number;
    homeCurrency: string;
    rate: number;
  }) => void;
}

export const CurrencyConverterModal: React.FC<CurrencyConverterModalProps> = ({
  trip,
  settings,
  onClose,
  onUpdateTrip,
  onSaveSettings,
  initialFromCurrency,
  initialAmount,
  onApplyConversion
}) => {
  const homeCode = trip?.homeCurrency || settings.homeCurrency || 'GBP';
  const defaultForeignCode =
    initialFromCurrency ||
    trip?.defaultExpenseCurrency ||
    (homeCode === 'GBP' ? 'EUR' : 'GBP');

  const [fromCurrency, setFromCurrency] = useState<string>(defaultForeignCode);
  const [toCurrency, setToCurrency] = useState<string>(homeCode);
  const [amountStr, setAmountStr] = useState<string>(initialAmount ? String(initialAmount) : '100');
  const [customRateStr, setCustomRateStr] = useState<string>('');
  const [liveRates, setLiveRates] = useState<Record<string, number> | null>(null);
  const [isFetchingRates, setIsFetchingRates] = useState<boolean>(false);
  const [rateStatus, setRateStatus] = useState<string>('Standard Reference');
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  // Calculate default rate
  const defaultRate = useMemo(() => {
    return getDefaultExchangeRate(fromCurrency, toCurrency);
  }, [fromCurrency, toCurrency]);

  // Active rate to apply
  const effectiveRate = useMemo(() => {
    const parsed = parseFloat(customRateStr);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultRate;
  }, [customRateStr, defaultRate]);

  // Converted result
  const amount = parseFloat(amountStr) || 0;
  const convertedAmount = useMemo(() => {
    return Math.round((amount * effectiveRate + Number.EPSILON) * 100) / 100;
  }, [amount, effectiveRate]);

  // Inverse rate for clarity (1 home = X foreign)
  const inverseRate = useMemo(() => {
    return effectiveRate > 0 ? Math.round((1 / effectiveRate) * 10000) / 10000 : 0;
  }, [effectiveRate]);

  // Fetch live rates on demand
  const handleFetchLiveRates = async () => {
    setIsFetchingRates(true);
    setRateStatus('Fetching live rates…');
    const rates = await fetchLiveRates(fromCurrency);
    setIsFetchingRates(false);

    if (rates && rates[toCurrency.toUpperCase()]) {
      const liveRate = rates[toCurrency.toUpperCase()];
      setLiveRates(rates);
      setCustomRateStr(String(Math.round(liveRate * 10000) / 10000));
      setRateStatus(`Live Market Rate (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
    } else {
      setRateStatus('Offline / Reference rates active');
    }
  };

  const handleSwapCurrencies = () => {
    const prevFrom = fromCurrency;
    const prevTo = toCurrency;
    setFromCurrency(prevTo);
    setToCurrency(prevFrom);
    setCustomRateStr('');
  };

  const handleResetRate = () => {
    setCustomRateStr('');
    setRateStatus('Standard Reference');
  };

  // Set as trip default expense currency
  const handleSetTripDefaultCurrency = () => {
    if (!trip || !onUpdateTrip) return;
    onUpdateTrip(
      {
        ...trip,
        defaultExpenseCurrency: fromCurrency,
        homeCurrency: toCurrency,
        updatedAt: Date.now()
      },
      {
        action: 'currency-settings-updated',
        detail: `Set default trip currency to ${fromCurrency} (Home: ${toCurrency}) for ${trip.name}`
      }
    );
    setSavedSuccessMsg(`Saved ${fromCurrency} as default for ${trip.name}`);
    setTimeout(() => setSavedSuccessMsg(null), 3000);
  };

  // Set as app-wide home currency
  const handleSetGlobalHomeCurrency = () => {
    if (!onSaveSettings) return;
    onSaveSettings({
      ...settings,
      homeCurrency: toCurrency
    });
    setSavedSuccessMsg(`Saved ${toCurrency} as your global Home Currency`);
    setTimeout(() => setSavedSuccessMsg(null), 3000);
  };

  // Distinct currencies used in trip items
  const tripUsedCurrencies = useMemo(() => {
    if (!trip) return [];
    const set = new Set<string>();
    trip.expenses.forEach(e => {
      if (e.currency) set.add(e.currency);
    });
    trip.planItems.forEach(p => {
      if (p.currency) set.add(p.currency);
    });
    return Array.from(set);
  }, [trip]);

  // Pocket reference table denominations
  const denominations = [1, 5, 10, 20, 50, 100, 200, 500];

  const fromInfo = getCurrencyInfo(fromCurrency);
  const toInfo = getCurrencyInfo(toCurrency);

  return (
    <ModalWrapper title="Currency Converter & Rate Tracker" wide onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
        {/* Converter Card */}
        <div
          style={{
            background: 'var(--paper-raised)',
            border: '1px solid var(--paper-edge)',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}
        >
          {/* Currency Selection Selectors */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '16px'
            }}
          >
            {/* From Currency (Expense) */}
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-soft)', fontWeight: 600 }}>
                Expense / Local Currency
              </label>
              <select
                value={fromCurrency}
                onChange={e => {
                  setFromCurrency(e.target.value);
                  setCustomRateStr('');
                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--paper-edge)',
                  background: 'var(--paper)',
                  color: 'var(--ink)',
                  fontWeight: 600
                }}
              >
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code} — {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <button
              type="button"
              className="btn-ghost"
              onClick={handleSwapCurrencies}
              title="Swap Currencies"
              style={{
                alignSelf: 'flex-end',
                marginBottom: '2px',
                padding: '8px 12px',
                borderRadius: '50%',
                fontWeight: 'bold'
              }}
            >
              ⇄
            </button>

            {/* To Currency (Home) */}
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-soft)', fontWeight: 600 }}>
                Home Currency
              </label>
              <select
                value={toCurrency}
                onChange={e => {
                  setToCurrency(e.target.value);
                  setCustomRateStr('');
                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--paper-edge)',
                  background: 'var(--paper)',
                  color: 'var(--ink)',
                  fontWeight: 600
                }}
              >
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code} — {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount & Result Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              padding: '16px',
              background: 'var(--paper)',
              borderRadius: '6px',
              border: '1px solid var(--line)',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ flex: '1 1 140px' }}>
              <label style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>
                Amount in {fromInfo.code} ({fromInfo.symbol}):
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--ink-soft)' }}>
                  {fromInfo.symbol}
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={amountStr}
                  onChange={e => setAmountStr(e.target.value)}
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    padding: '6px 10px',
                    width: '100%',
                    fontFamily: 'var(--font-mono)'
                  }}
                  autoFocus
                />
              </div>
            </div>

            <div style={{ fontSize: '24px', color: 'var(--brass)', padding: '0 8px' }}>
              =
            </div>

            <div style={{ flex: '1 1 160px', textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>
                Converted to {toInfo.code}:
              </div>
              <div
                style={{
                  fontSize: '26px',
                  fontWeight: 700,
                  color: 'var(--green)',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '0.5px'
                }}
              >
                {formatCurrencyAmount(convertedAmount, toInfo.code)}
              </div>
            </div>
          </div>

          {/* Exchange Rate Adjustment Bar */}
          <div
            style={{
              marginTop: '14px',
              padding: '10px 14px',
              background: 'var(--paper-raised)',
              border: '1px solid var(--paper-edge)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              fontSize: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600 }}>Rate Applied:</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>
                1 {fromInfo.code} =
              </span>
              <input
                type="number"
                step="any"
                min="0.000001"
                placeholder={String(defaultRate)}
                value={customRateStr}
                onChange={e => {
                  setCustomRateStr(e.target.value);
                  setRateStatus('Custom Rate');
                }}
                style={{
                  width: '110px',
                  padding: '4px 6px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600
                }}
              />
              <span style={{ fontFamily: 'var(--font-mono)' }}>{toInfo.code}</span>

              {customRateStr && (
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={handleResetRate}
                  title="Reset to standard rate"
                  style={{ fontSize: '11px', padding: '2px 6px' }}
                >
                  Reset
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--ink-soft)',
                  background: 'var(--paper)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid var(--line)'
                }}
              >
                {rateStatus}
              </span>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={handleFetchLiveRates}
                disabled={isFetchingRates}
                style={{ fontSize: '11px', padding: '3px 8px' }}
              >
                {isFetchingRates ? 'Fetching…' : '🔄 Refresh Live Rate'}
              </button>
            </div>
          </div>

          {/* Rate Direction Summary */}
          <div
            style={{
              marginTop: '6px',
              fontSize: '11px',
              color: 'var(--ink-soft)',
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0 4px'
            }}
          >
            <span>
              1 {fromInfo.code} = {effectiveRate} {toInfo.code}
            </span>
            <span>
              1 {toInfo.code} = {inverseRate} {fromInfo.code}
            </span>
          </div>

          {/* Quick Apply Button if callback provided */}
          {onApplyConversion && (
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  onApplyConversion({
                    foreignAmount: amount,
                    foreignCurrency: fromInfo.code,
                    homeAmount: convertedAmount,
                    homeCurrency: toInfo.code,
                    rate: effectiveRate
                  });
                  onClose();
                }}
              >
                ✓ Apply to Item ({formatCurrencyAmount(convertedAmount, toInfo.code)})
              </button>
            </div>
          )}
        </div>

        {/* Pocket Denomination Cheat Sheet */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
              Quick Pocket Reference ({fromInfo.code} → {toInfo.code})
            </span>
            <span style={{ fontSize: '11px', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
              At rate {effectiveRate}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
              gap: '8px'
            }}
          >
            {denominations.map(d => {
              const conv = Math.round((d * effectiveRate + Number.EPSILON) * 100) / 100;
              return (
                <div
                  key={d}
                  style={{
                    padding: '8px 10px',
                    background: 'var(--paper-raised)',
                    border: '1px solid var(--paper-edge)',
                    borderRadius: '4px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                    {formatCurrencyAmount(d, fromInfo.code)}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
                    {formatCurrencyAmount(conv, toInfo.code)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trip Currency Preferences & Feedback */}
        {trip && (
          <div
            style={{
              padding: '12px 14px',
              background: 'var(--paper)',
              border: '1px solid var(--paper-edge)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}
          >
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600 }}>
                Trip Defaults for "{trip.name}"
              </div>
              <div style={{ fontSize: '11px', color: 'var(--ink-soft)', marginTop: '2px' }}>
                Home: <strong>{toCurrency}</strong> · Expense: <strong>{fromCurrency}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {onUpdateTrip && (
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={handleSetTripDefaultCurrency}
                  title="Save as trip default currencies"
                >
                  Save as Trip Default
                </button>
              )}
              {onSaveSettings && (
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={handleSetGlobalHomeCurrency}
                  title="Save home currency globally"
                >
                  Save Global Home
                </button>
              )}
            </div>
          </div>
        )}

        {savedSuccessMsg && (
          <div
            style={{
              padding: '8px 12px',
              background: 'var(--paper-raised)',
              border: '1px solid var(--brass)',
              color: 'var(--green)',
              borderRadius: '4px',
              fontSize: '12px',
              textAlign: 'center',
              fontWeight: 600
            }}
          >
            ✓ {savedSuccessMsg}
          </div>
        )}
      </div>

      <div className="modal-actions" style={{ marginTop: '16px' }}>
        <button type="button" className="btn-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </ModalWrapper>
  );
};
