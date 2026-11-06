import React, { useEffect, useRef, useState } from 'react';
import { Trip, TripNotesData, SafetyLevel } from '../types';
import { uid, emptyTripNotes, siteNameFromUrl, normalizeWebUrl, parseCoords } from '../utils/helpers';

interface NotesTabProps {
  trip: Trip;
  onUpdateTrip: (updated: Trip, logAction?: { action: string; detail: string }) => void;
  onShowToast: (msg: string) => void;
}

type SaveFn = (patch: Partial<TripNotesData>) => void;

const fmtWhen = (ts: number) =>
  new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const mapsLinkFor = (pin: { label: string; coords: string; url: string }, tripName: string) => {
  if (pin.url) return pin.url;
  const c = parseCoords(pin.coords);
  if (c) return `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pin.label} ${tripName}`.trim())}`;
};

// "https://x.com/scotland/edinburgh-guide" -> "Edinburgh guide" (empty if the path says nothing)
const titleFromUrl = (url: string): string => {
  try {
    const seg = new URL(url).pathname.split('/').filter(Boolean).pop() || '';
    const clean = decodeURIComponent(seg).replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[-_+]+/g, ' ').trim();
    if (!clean || /^\d+$/.test(clean)) return '';
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  } catch {
    return '';
  }
};

// "Site - Title", or just "Site" when there is no distinct title
const clipLabel = (c: { site: string; title: string }) => (c.title && c.title !== c.site ? `${c.site} - ${c.title}` : c.site);

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const CardHead: React.FC<{ title: string; count?: number; children?: React.ReactNode }> = ({ title, count, children }) => (
  <div className="notes-card-head">
    <h3>
      {title}
      {count !== undefined && <span className="notes-count">{count}</span>}
    </h3>
    {children}
  </div>
);

/* ------------------------------------------------------------------ */
/* 1. Journal / audio logs                                             */
/* ------------------------------------------------------------------ */
const JournalSection: React.FC<{ notes: TripNotesData; save: SaveFn; toast: (m: string) => void }> = ({ notes, save, toast }) => {
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const baseRef = useRef('');
  const usedVoice = useRef(false);

  const SR: any = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

  useEffect(() => () => recRef.current?.stop?.(), []);

  const stopDictation = () => {
    recRef.current?.stop?.();
    setListening(false);
  };

  const toggleDictation = () => {
    if (listening) {
      stopDictation();
      return;
    }
    try {
      const rec = new SR();
      rec.lang = navigator.language || 'en-GB';
      rec.interimResults = true;
      rec.continuous = true;
      baseRef.current = text ? text.replace(/\s+$/, '') + ' ' : '';
      rec.onresult = (e: any) => {
        let transcript = '';
        for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
        setText(baseRef.current + transcript);
        usedVoice.current = true;
      };
      rec.onerror = () => {
        setListening(false);
        toast('Dictation stopped (check microphone permission)');
      };
      rec.onend = () => setListening(false);
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch {
      toast('Dictation is not available in this browser');
    }
  };

  const add = () => {
    const body = text.trim();
    if (!body) return;
    if (listening) stopDictation();
    save({
      entries: [{ id: uid('note'), text: body, kind: usedVoice.current ? 'voice' : 'note', createdAt: Date.now() }, ...notes.entries]
    });
    setText('');
    usedVoice.current = false;
  };

  const saveEdit = (id: string) => {
    const body = editText.trim();
    if (!body) return;
    save({ entries: notes.entries.map(n => (n.id === id ? { ...n, text: body } : n)) });
    setEditingId(null);
  };

  return (
    <section className="notes-card">
      <CardHead title="📓 My Raw Context & Audio Logs" count={notes.entries.length} />
      <div className="notes-form">
        <textarea
          className="notes-input notes-textarea"
          rows={3}
          value={text}
          placeholder="Write it like you'd say it… what hit you, what to skip, what you'd do again."
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              add();
            }
          }}
        />
        <div className="notes-row">
          <button type="button" className="btn-primary btn-sm" onClick={add} disabled={!text.trim()}>
            Add note
          </button>
          {SR && (
            <button type="button" className={`btn-ghost btn-sm ${listening ? 'notes-live' : ''}`} onClick={toggleDictation}>
              {listening ? '⏹ Stop dictating' : '🎙 Dictate'}
            </button>
          )}
          <span className="notes-hint">Ctrl/⌘ + Enter to add</span>
        </div>
      </div>

      {notes.entries.length === 0 ? (
        <div className="notes-empty">No notes yet. Capture the stuff you'd forget by tomorrow.</div>
      ) : (
        <ul className="notes-list">
          {notes.entries.map(n => (
            <li key={n.id} className="notes-item">
              {editingId === n.id ? (
                <div className="notes-form" style={{ flex: 1 }}>
                  <textarea className="notes-input notes-textarea" rows={3} value={editText} autoFocus onChange={e => setEditText(e.target.value)} />
                  <div className="notes-row">
                    <button type="button" className="btn-primary btn-sm" onClick={() => saveEdit(n.id)}>
                      Save
                    </button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="notes-bullet">•</span>
                  <div className="notes-body">
                    <div className="notes-text">{n.text}</div>
                    <div className="notes-meta">
                      {n.kind === 'voice' && <span className="notes-tag">🎙 Voice</span>}
                      {fmtWhen(n.createdAt)}
                    </div>
                  </div>
                  <div className="notes-actions">
                    <button
                      type="button"
                      className="notes-icon-btn"
                      title="Edit"
                      aria-label="Edit note"
                      onClick={() => {
                        setEditingId(n.id);
                        setEditText(n.text);
                      }}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="notes-icon-btn danger"
                      title="Delete"
                      aria-label="Delete note"
                      onClick={() => {
                        save({ entries: notes.entries.filter(x => x.id !== n.id) });
                        toast('Note deleted');
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* 2. Web clips                                                        */
/* ------------------------------------------------------------------ */
const ClipsSection: React.FC<{ notes: TripNotesData; save: SaveFn; toast: (m: string) => void }> = ({ notes, save, toast }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const reset = () => {
    setUrl('');
    setTitle('');
    setWhy('');
    setEditingId(null);
  };

  const submit = () => {
    const clean = normalizeWebUrl(url);
    if (!clean) {
      toast('Paste a valid link, e.g. https://example.com/guide');
      return;
    }
    const site = siteNameFromUrl(clean) || 'Web';
    const fields = { url: clean, site, title: title.trim() || titleFromUrl(clean) || site, why: why.trim() };
    if (editingId) {
      save({ clips: notes.clips.map(c => (c.id === editingId ? { ...c, ...fields } : c)) });
    } else {
      save({ clips: [{ id: uid('clip'), createdAt: Date.now(), ...fields }, ...notes.clips] });
    }
    reset();
  };

  const asMarkdown = (c: { site: string; title: string; url: string; why: string }) =>
    `[${clipLabel(c)}](${c.url})${c.why ? ` — ${c.why}` : ''}`;

  const copyAll = async () => {
    const ok = await copyText(notes.clips.map(c => `- ${asMarkdown(c)}`).join('\n'));
    toast(ok ? 'Clips copied as Markdown' : 'Could not copy — your browser blocked clipboard access');
  };

  return (
    <section className="notes-card">
      <CardHead title="📎 Web Clips & References" count={notes.clips.length}>
        {notes.clips.length > 0 && (
          <button type="button" className="btn-ghost btn-sm" onClick={copyAll}>
            Copy as Markdown
          </button>
        )}
      </CardHead>
      <div className="notes-form">
        <input className="notes-input" type="url" inputMode="url" placeholder="Paste a link…" value={url} onChange={e => setUrl(e.target.value)} />
        <div className="notes-row">
          <input className="notes-input" style={{ flex: '1 1 180px' }} placeholder="Title (optional)" value={title} onChange={e => setTitle(e.target.value)} />
          <input
            className="notes-input"
            style={{ flex: '2 1 240px' }}
            placeholder="Why clip it? One line."
            value={why}
            onChange={e => setWhy(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
        </div>
        <div className="notes-row">
          <button type="button" className="btn-primary btn-sm" onClick={submit} disabled={!url.trim()}>
            {editingId ? 'Save clip' : 'Clip it'}
          </button>
          {editingId && (
            <button type="button" className="btn-ghost btn-sm" onClick={reset}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {notes.clips.length === 0 ? (
        <div className="notes-empty">Nothing clipped yet. Save the guide, menu or map you'll want offline later.</div>
      ) : (
        <ul className="notes-list">
          {notes.clips.map(c => (
            <li key={c.id} className="notes-item">
              <span className="notes-bullet">📎</span>
              <div className="notes-body">
                <a className="notes-link" href={c.url} target="_blank" rel="noopener noreferrer">
                  {clipLabel(c)}
                </a>
                {c.why && <div className="notes-why">{c.why}</div>}
              </div>
              <div className="notes-actions">
                <button
                  type="button"
                  className="notes-icon-btn"
                  title="Copy as Markdown"
                  aria-label="Copy as Markdown"
                  onClick={async () => toast((await copyText(asMarkdown(c))) ? 'Copied' : 'Could not copy')}
                >
                  ⧉
                </button>
                <button
                  type="button"
                  className="notes-icon-btn"
                  title="Edit"
                  aria-label="Edit clip"
                  onClick={() => {
                    setEditingId(c.id);
                    setUrl(c.url);
                    setTitle(c.title === c.site ? '' : c.title);
                    setWhy(c.why);
                  }}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="notes-icon-btn danger"
                  title="Delete"
                  aria-label="Delete clip"
                  onClick={() => {
                    save({ clips: notes.clips.filter(x => x.id !== c.id) });
                    toast('Clip deleted');
                  }}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* 3. Geo-pins                                                         */
/* ------------------------------------------------------------------ */
const PinsSection: React.FC<{ notes: TripNotesData; save: SaveFn; toast: (m: string) => void; tripName: string }> = ({ notes, save, toast, tripName }) => {
  const [label, setLabel] = useState('');
  const [where, setWhere] = useState('');
  const [note, setNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const reset = () => {
    setLabel('');
    setWhere('');
    setNote('');
    setEditingId(null);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast('Location is not available on this device');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setWhere(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast('Could not get your location (check permission)');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submit = () => {
    const raw = where.trim();
    let coords = '';
    let url = '';
    if (raw) {
      const c = parseCoords(raw);
      if (c) {
        coords = `${c.lat}, ${c.lng}`;
      } else {
        const link = normalizeWebUrl(raw);
        if (!link) {
          toast('Use "lat, lng" (e.g. 51.5007, -0.1246) or a Google Maps link');
          return;
        }
        url = link;
      }
    }
    const name = label.trim() || (coords ? 'Dropped pin' : '');
    if (!name) {
      toast('Give the pin a name');
      return;
    }
    const fields = { label: name, coords, url, note: note.trim() };
    if (editingId) {
      save({ pins: notes.pins.map(p => (p.id === editingId ? { ...p, ...fields } : p)) });
    } else {
      save({ pins: [{ id: uid('pin'), createdAt: Date.now(), ...fields }, ...notes.pins] });
    }
    reset();
  };

  return (
    <section className="notes-card">
      <CardHead title="🗺️ Saved Geo-Pins" count={notes.pins.length} />
      <div className="notes-form">
        <div className="notes-row">
          <input className="notes-input" style={{ flex: '1 1 180px' }} placeholder="Pin name (e.g. Sunrise alley)" value={label} onChange={e => setLabel(e.target.value)} />
          <input
            className="notes-input"
            style={{ flex: '2 1 240px' }}
            placeholder="lat, lng  or  Google Maps link"
            value={where}
            onChange={e => setWhere(e.target.value)}
          />
        </div>
        <input
          className="notes-input"
          placeholder="Note (optional): best at golden hour, trailhead behind the café…"
          value={note}
          onChange={e => setNote(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />
        <div className="notes-row">
          <button type="button" className="btn-primary btn-sm" onClick={submit} disabled={!label.trim() && !where.trim()}>
            {editingId ? 'Save pin' : 'Add pin'}
          </button>
          <button type="button" className="btn-ghost btn-sm" onClick={useMyLocation} disabled={locating}>
            {locating ? 'Locating…' : '📍 Use my location'}
          </button>
          {editingId && (
            <button type="button" className="btn-ghost btn-sm" onClick={reset}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {notes.pins.length === 0 ? (
        <div className="notes-empty">No pins yet. Drop the photo spots and trailheads you don't want to lose.</div>
      ) : (
        <ul className="notes-list">
          {notes.pins.map(p => (
            <li key={p.id} className="notes-item">
              <span className="notes-bullet">📍</span>
              <div className="notes-body">
                <div className="notes-text" style={{ fontWeight: 600 }}>
                  {p.label}
                </div>
                {p.note && <div className="notes-why">{p.note}</div>}
                <div className="notes-meta">
                  {p.coords && <span style={{ marginRight: 8 }}>{p.coords}</span>}
                  <a className="notes-link" href={mapsLinkFor(p, tripName)} target="_blank" rel="noopener noreferrer">
                    Open in Maps ↗
                  </a>
                </div>
              </div>
              <div className="notes-actions">
                <button
                  type="button"
                  className="notes-icon-btn"
                  title="Edit"
                  aria-label="Edit pin"
                  onClick={() => {
                    setEditingId(p.id);
                    setLabel(p.label);
                    setWhere(p.coords || p.url);
                    setNote(p.note);
                  }}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="notes-icon-btn danger"
                  title="Delete"
                  aria-label="Delete pin"
                  onClick={() => {
                    save({ pins: notes.pins.filter(x => x.id !== p.id) });
                    toast('Pin deleted');
                  }}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* 4. Practical dashboard                                              */
/* ------------------------------------------------------------------ */
const SAFETY: { id: Exclude<SafetyLevel, ''>; label: string; icon: string }[] = [
  { id: 'low', label: 'Low risk', icon: '🟢' },
  { id: 'medium', label: 'Take care', icon: '🟡' },
  { id: 'high', label: 'High risk', icon: '🔴' }
];

const PracticalSection: React.FC<{ notes: TripNotesData; save: SaveFn; currencyHint: string }> = ({ notes, save, currencyHint }) => {
  const p = notes.practical;
  const [currency, setCurrency] = useState(p.currency);
  const [emergency, setEmergency] = useState(p.emergency);
  const [app, setApp] = useState('');

  const patch = (next: Partial<typeof p>) => save({ practical: { ...p, ...next } });

  const addApp = () => {
    const name = app.trim();
    if (!name) return;
    if (!p.apps.some(a => a.toLowerCase() === name.toLowerCase())) patch({ apps: [...p.apps, name] });
    setApp('');
  };

  return (
    <section className="notes-card">
      <CardHead title="🛠️ Practical Dashboard" />
      <div className="notes-grid">
        <label className="notes-tile">
          <span className="notes-tile-label">Currency</span>
          <input
            className="notes-input"
            value={currency}
            placeholder={currencyHint || 'e.g. EUR'}
            onChange={e => setCurrency(e.target.value)}
            onBlur={() => currency.trim() !== p.currency && patch({ currency: currency.trim() })}
            onKeyDown={e => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
          />
        </label>
        <label className="notes-tile">
          <span className="notes-tile-label">Emergency number</span>
          <input
            className="notes-input"
            inputMode="tel"
            value={emergency}
            placeholder="e.g. 112"
            onChange={e => setEmergency(e.target.value)}
            onBlur={() => emergency.trim() !== p.emergency && patch({ emergency: emergency.trim() })}
            onKeyDown={e => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
          />
        </label>
      </div>

      <div className="notes-tile" style={{ marginTop: 12 }}>
        <span className="notes-tile-label">Current safety level</span>
        <div className="notes-row" role="group" aria-label="Current safety level">
          {SAFETY.map(s => (
            <button
              key={s.id}
              type="button"
              className={`notes-safety ${s.id} ${p.safety === s.id ? 'active' : ''}`}
              aria-pressed={p.safety === s.id}
              onClick={() => patch({ safety: p.safety === s.id ? '' : s.id })}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="notes-tile" style={{ marginTop: 12 }}>
        <span className="notes-tile-label">Essential apps to download</span>
        {p.apps.length > 0 && (
          <div className="notes-chips">
            {p.apps.map(a => (
              <span key={a} className="notes-chip">
                {a}
                <button type="button" aria-label={`Remove ${a}`} onClick={() => patch({ apps: p.apps.filter(x => x !== a) })}>
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="notes-row">
          <input
            className="notes-input"
            style={{ flex: '1 1 200px' }}
            value={app}
            placeholder="e.g. Citymapper, Bolt, Google Translate"
            onChange={e => setApp(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addApp();
              }
            }}
          />
          <button type="button" className="btn-ghost btn-sm" onClick={addApp} disabled={!app.trim()}>
            Add
          </button>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
export const NotesTab: React.FC<NotesTabProps> = ({ trip, onUpdateTrip, onShowToast }) => {
  const notes = trip.tripNotes ?? emptyTripNotes();

  const save: SaveFn = patch => {
    onUpdateTrip({ ...trip, tripNotes: { ...notes, ...patch }, updatedAt: Date.now() });
  };

  return (
    <div className="notes-tab">
      <JournalSection notes={notes} save={save} toast={onShowToast} />
      <ClipsSection notes={notes} save={save} toast={onShowToast} />
      <PinsSection notes={notes} save={save} toast={onShowToast} tripName={trip.name} />
      <PracticalSection notes={notes} save={save} currencyHint={trip.defaultExpenseCurrency || ''} />
    </div>
  );
};
