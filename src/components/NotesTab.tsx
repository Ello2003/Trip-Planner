import React, { useEffect, useRef, useState } from 'react';
import { Trip, TripNotesData } from '../types';
import { uid, emptyTripNotes, siteNameFromUrl, normalizeWebUrl } from '../utils/helpers';
import { loadTripUi, saveTripUi } from '../utils/uiPrefs';
import { TripDocumentsPanel } from './TripDocumentsPanel';

interface NotesTabProps {
  trip: Trip;
  onUpdateTrip: (updated: Trip, logAction?: { action: string; detail: string }) => void;
  onShowToast: (msg: string) => void;
}

type SaveFn = (patch: Partial<TripNotesData>) => void;
type SectionKey = 'journal' | 'clips' | 'documents';

const fmtWhen = (ts: number) =>
  new Date(ts).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

const titleFromUrl = (url: string): string => {
  try {
    const seg = new URL(url).pathname.split('/').filter(Boolean).pop() || '';
    const clean = decodeURIComponent(seg)
      .replace(/\.[a-z0-9]{2,5}$/i, '')
      .replace(/[-_+]+/g, ' ')
      .trim();
    if (!clean || /^\d+$/.test(clean)) return '';
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  } catch {
    return '';
  }
};

const clipLabel = (c: { site: string; title: string }) =>
  c.title && c.title !== c.site ? `${c.site} — ${c.title}` : c.site;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const SectionHead: React.FC<{
  title: string;
  count?: number;
  collapsed: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
}> = ({ title, count, collapsed, onToggle, onDelete, deleteLabel }) => (
  <div className="notes-card-head">
    <button type="button" className="notes-collapse-btn" onClick={onToggle} aria-expanded={!collapsed}>
      <span className="notes-chevron" aria-hidden>
        {collapsed ? '▸' : '▾'}
      </span>
      <h3>
        {title}
        {count !== undefined && <span className="notes-count">{count}</span>}
      </h3>
    </button>
    <div className="notes-head-actions">
      {onDelete && (
        <button type="button" className="btn-ghost btn-sm notes-text-btn" onClick={onDelete} title={deleteLabel || 'Remove section'}>
          Remove
        </button>
      )}
    </div>
  </div>
);

/* Journal ------------------------------------------------------------ */
const JournalSection: React.FC<{
  notes: TripNotesData;
  save: SaveFn;
  toast: (m: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  onRemove: () => void;
}> = ({ notes, save, toast, collapsed, onToggle, onRemove }) => {
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => () => recognitionRef.current?.stop?.(), []);

  const toggleDictation = () => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast('Voice input is not supported in this browser');
      return;
    }
    if (listening) {
      recognitionRef.current?.stop?.();
      setListening(false);
      return;
    }
    const rec = new SR();
    recognitionRef.current = rec;
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const said = Array.from(e.results as any[])
        .map((r: any) => r[0]?.transcript || '')
        .join(' ')
        .trim();
      if (said) setText(prev => (prev ? `${prev} ${said}` : said));
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  const add = () => {
    const body = text.trim();
    if (!body) return;
    save({
      entries: [{ id: uid('note'), text: body, kind: 'note', createdAt: Date.now() }, ...notes.entries]
    });
    setText('');
  };

  const saveEdit = (id: string) => {
    const body = editText.trim();
    if (!body) return;
    save({ entries: notes.entries.map(n => (n.id === id ? { ...n, text: body } : n)) });
    setEditingId(null);
  };

  const clearAll = () => {
    if (!notes.entries.length) {
      onRemove();
      return;
    }
    if (!window.confirm('Remove the Journal section and delete all entries on this trip?')) return;
    save({ entries: [] });
    onRemove();
  };

  return (
    <section className={`notes-card ${collapsed ? 'is-collapsed' : ''}`}>
      <SectionHead
        title="Journal"
        count={notes.entries.length}
        collapsed={collapsed}
        onToggle={onToggle}
        onDelete={clearAll}
        deleteLabel="Remove journal section"
      />
      {!collapsed && (
        <>
          <div className="notes-form">
            <textarea
              className="notes-input notes-textarea"
              rows={3}
              placeholder="Trip notes, reminders, observations…"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  add();
                }
              }}
            />
            <div className="notes-row">
              <button type="button" className="btn-primary btn-sm" onClick={add} disabled={!text.trim()}>
                Add note
              </button>
              <button
                type="button"
                className={`btn-ghost btn-sm ${listening ? 'notes-live' : ''}`}
                onClick={toggleDictation}
              >
                {listening ? 'Listening…' : 'Dictate'}
              </button>
              <span className="notes-hint">Ctrl/⌘ + Enter</span>
            </div>
          </div>

          {notes.entries.length === 0 ? (
            <div className="notes-empty">No journal entries yet.</div>
          ) : (
            <ul className="notes-list">
              {notes.entries.map(n => (
                <li key={n.id} className="notes-item">
                  {editingId === n.id ? (
                    <div className="notes-form" style={{ flex: 1 }}>
                      <textarea
                        className="notes-input notes-textarea"
                        rows={3}
                        value={editText}
                        autoFocus
                        onChange={e => setEditText(e.target.value)}
                      />
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
                      <div className="notes-body">
                        <div className="notes-text">{n.text}</div>
                        <div className="notes-meta">
                          {n.kind === 'voice' && <span className="notes-tag">Dictated</span>}
                          <span>{fmtWhen(n.createdAt)}</span>
                        </div>
                      </div>
                      <div className="notes-actions">
                        <button
                          type="button"
                          className="btn-ghost btn-sm notes-text-btn"
                          onClick={() => {
                            setEditingId(n.id);
                            setEditText(n.text);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-ghost btn-sm notes-text-btn danger"
                          onClick={() => save({ entries: notes.entries.filter(x => x.id !== n.id) })}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
};

/* Web clips ---------------------------------------------------------- */
const ClipsSection: React.FC<{
  notes: TripNotesData;
  save: SaveFn;
  toast: (m: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  onRemove: () => void;
}> = ({ notes, save, toast, collapsed, onToggle, onRemove }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editWhy, setEditWhy] = useState('');

  const add = () => {
    const raw = url.trim();
    if (!raw) return;
    const normalized = normalizeWebUrl(raw);
    const site = siteNameFromUrl(normalized) || 'Link';
    const t = title.trim() || titleFromUrl(normalized);
    save({
      clips: [
        {
          id: uid('clip'),
          site,
          title: t,
          url: normalized,
          why: why.trim(),
          createdAt: Date.now()
        },
        ...notes.clips
      ]
    });
    setUrl('');
    setTitle('');
    setWhy('');
  };

  const saveEdit = (id: string) => {
    const normalized = normalizeWebUrl(editUrl.trim());
    if (!normalized) return;
    const site = siteNameFromUrl(normalized) || 'Link';
    save({
      clips: notes.clips.map(c =>
        c.id === id
          ? {
              ...c,
              url: normalized,
              site,
              title: editTitle.trim() || titleFromUrl(normalized),
              why: editWhy.trim()
            }
          : c
      )
    });
    setEditingId(null);
  };

  const clearAll = () => {
    if (!notes.clips.length) {
      onRemove();
      return;
    }
    if (!window.confirm('Remove the Links section and delete all saved links on this trip?')) return;
    save({ clips: [] });
    onRemove();
  };

  return (
    <section className={`notes-card ${collapsed ? 'is-collapsed' : ''}`}>
      <SectionHead
        title="Links & references"
        count={notes.clips.length}
        collapsed={collapsed}
        onToggle={onToggle}
        onDelete={clearAll}
        deleteLabel="Remove links section"
      />
      {!collapsed && (
        <>
          <div className="notes-form">
            <input
              className="notes-input"
              placeholder="https://…"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  add();
                }
              }}
            />
            <div className="notes-row">
              <input
                className="notes-input"
                style={{ flex: '1 1 140px' }}
                placeholder="Title (optional)"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
              <input
                className="notes-input"
                style={{ flex: '2 1 180px' }}
                placeholder="Why it matters (optional)"
                value={why}
                onChange={e => setWhy(e.target.value)}
              />
            </div>
            <div className="notes-row">
              <button type="button" className="btn-primary btn-sm" onClick={add} disabled={!url.trim()}>
                Add link
              </button>
            </div>
          </div>

          {notes.clips.length === 0 ? (
            <div className="notes-empty">No links saved yet.</div>
          ) : (
            <ul className="notes-list">
              {notes.clips.map(c => (
                <li key={c.id} className="notes-item">
                  {editingId === c.id ? (
                    <div className="notes-form" style={{ flex: 1 }}>
                      <input className="notes-input" value={editUrl} onChange={e => setEditUrl(e.target.value)} />
                      <div className="notes-row">
                        <input
                          className="notes-input"
                          style={{ flex: 1 }}
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          placeholder="Title"
                        />
                        <input
                          className="notes-input"
                          style={{ flex: 2 }}
                          value={editWhy}
                          onChange={e => setEditWhy(e.target.value)}
                          placeholder="Why"
                        />
                      </div>
                      <div className="notes-row">
                        <button type="button" className="btn-primary btn-sm" onClick={() => saveEdit(c.id)}>
                          Save
                        </button>
                        <button type="button" className="btn-ghost btn-sm" onClick={() => setEditingId(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="notes-body">
                        <a className="notes-link" href={c.url} target="_blank" rel="noopener noreferrer">
                          {clipLabel(c)}
                        </a>
                        {c.why && <div className="notes-why">{c.why}</div>}
                        <div className="notes-meta">
                          <span>{fmtWhen(c.createdAt)}</span>
                        </div>
                      </div>
                      <div className="notes-actions">
                        <button
                          type="button"
                          className="btn-ghost btn-sm notes-text-btn"
                          onClick={async () => {
                            const ok = await copyText(`${clipLabel(c)}\n${c.url}${c.why ? `\n${c.why}` : ''}`);
                            toast(ok ? 'Copied' : 'Could not copy');
                          }}
                        >
                          Copy
                        </button>
                        <button
                          type="button"
                          className="btn-ghost btn-sm notes-text-btn"
                          onClick={() => {
                            setEditingId(c.id);
                            setEditUrl(c.url);
                            setEditTitle(c.title);
                            setEditWhy(c.why);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-ghost btn-sm notes-text-btn danger"
                          onClick={() => save({ clips: notes.clips.filter(x => x.id !== c.id) })}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
};

export const NotesTab: React.FC<NotesTabProps> = ({ trip, onUpdateTrip, onShowToast }) => {
  const notes = trip.tripNotes ?? emptyTripNotes();
  const prefs = loadTripUi(trip.id);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => prefs.notesCollapsed || {});
  const [hidden, setHidden] = useState<string[]>(() => prefs.notesHiddenSections || []);

  useEffect(() => {
    const p = loadTripUi(trip.id);
    setCollapsed(p.notesCollapsed || {});
    setHidden(p.notesHiddenSections || []);
  }, [trip.id]);

  // Strip geo-pins and practicality from live data whenever Notes is shown
  useEffect(() => {
    const tn = trip.tripNotes;
    if (!tn) return;
    const hasPins = Array.isArray((tn as any).pins) && (tn as any).pins.length > 0;
    const hasPractical =
      tn.practical &&
      (tn.practical.currency ||
        tn.practical.emergency ||
        tn.practical.safety ||
        (tn.practical.apps && tn.practical.apps.length));
    if (!hasPins && !hasPractical && (!Array.isArray((tn as any).pins) || (tn as any).pins.length === 0)) {
      // still clear empty arrays if present so storage stays clean
      if ('pins' in (tn as object) || (tn.practical && Object.keys(tn.practical).some(k => (tn.practical as any)[k]))) {
        const cleaned = { ...tn, pins: [], practical: { currency: '', safety: '' as const, emergency: '', apps: [] } };
        // only write if pins had content or practical had content — avoid loop
      }
      return;
    }
    if (hasPins || hasPractical) {
      onUpdateTrip({
        ...trip,
        tripNotes: {
          ...tn,
          pins: [],
          practical: { currency: '', safety: '', emergency: '', apps: [] }
        },
        updatedAt: Date.now()
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id]);

  const save: SaveFn = patch => {
    onUpdateTrip({ ...trip, tripNotes: { ...notes, ...patch }, updatedAt: Date.now() });
  };

  const toggle = (key: SectionKey) => {
    setCollapsed(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveTripUi(trip.id, { notesCollapsed: next });
      return next;
    });
  };

  const hideSection = (key: SectionKey) => {
    setHidden(prev => {
      if (prev.includes(key)) return prev;
      const next = [...prev, key];
      saveTripUi(trip.id, { notesHiddenSections: next });
      return next;
    });
  };

  const restoreSection = (key: SectionKey) => {
    setHidden(prev => {
      const next = prev.filter(k => k !== key);
      saveTripUi(trip.id, { notesHiddenSections: next });
      return next;
    });
  };

  const showJournal = !hidden.includes('journal');
  const showClips = !hidden.includes('clips');
  const showDocs = !hidden.includes('documents');

  return (
    <div className="notes-tab">
      {showDocs && (
        <section className={`notes-card notes-docs-wrap ${collapsed.documents ? 'is-collapsed' : ''}`}>
          <SectionHead
            title="Documents"
            count={(trip.documents || []).filter(d => d.section === 'notes').length}
            collapsed={!!collapsed.documents}
            onToggle={() => toggle('documents')}
            onDelete={() => {
              if ((trip.documents || []).some(d => d.section === 'notes')) {
                if (!window.confirm('Hide the Documents section? Files stay on the trip until you delete them.')) return;
              }
              hideSection('documents');
            }}
          />
          {!collapsed.documents && (
            <TripDocumentsPanel
              trip={trip}
              section="notes"
              onUpdateTrip={onUpdateTrip}
              onShowToast={onShowToast}
              title=""
            />
          )}
        </section>
      )}

      {showJournal && (
        <JournalSection
          notes={notes}
          save={save}
          toast={onShowToast}
          collapsed={!!collapsed.journal}
          onToggle={() => toggle('journal')}
          onRemove={() => hideSection('journal')}
        />
      )}

      {showClips && (
        <ClipsSection
          notes={notes}
          save={save}
          toast={onShowToast}
          collapsed={!!collapsed.clips}
          onToggle={() => toggle('clips')}
          onRemove={() => hideSection('clips')}
        />
      )}

      {(hidden.includes('journal') || hidden.includes('clips') || hidden.includes('documents')) && (
        <div className="notes-restore">
          <span className="notes-hint">Removed sections:</span>
          {hidden.includes('documents') && (
            <button type="button" className="btn-ghost btn-sm" onClick={() => restoreSection('documents')}>
              Restore documents
            </button>
          )}
          {hidden.includes('journal') && (
            <button type="button" className="btn-ghost btn-sm" onClick={() => restoreSection('journal')}>
              Restore journal
            </button>
          )}
          {hidden.includes('clips') && (
            <button type="button" className="btn-ghost btn-sm" onClick={() => restoreSection('clips')}>
              Restore links
            </button>
          )}
        </div>
      )}
    </div>
  );
};
