import React, { useEffect, useRef, useState } from 'react';
import { Trip, TripDoc } from '../types';
import { uid } from '../utils/helpers';
import {
  DOC_MAX_BYTES,
  putDocBlob,
  getDocBlob,
  deleteDocBlob,
  dataUrlToBlob,
  formatDocSize
} from '../utils/docStore';

const ACCEPT =
  '.pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx,.rtf,.pages,.heic';

function iconFor(mime: string, name: string): string {
  const m = (mime || '').toLowerCase();
  const n = name.toLowerCase();
  if (m.includes('pdf') || n.endsWith('.pdf')) return '📄';
  if (m.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic)$/.test(n)) return '🖼️';
  if (m.includes('sheet') || m.includes('excel') || /\.(xlsx?|csv)$/.test(n)) return '📊';
  if (m.includes('word') || /\.(docx?|rtf|pages)$/.test(n)) return '📝';
  return '📎';
}

function isPdf(doc: TripDoc): boolean {
  const m = (doc.mimeType || '').toLowerCase();
  return m.includes('pdf') || doc.name.toLowerCase().endsWith('.pdf');
}

function isBrowserViewable(doc: TripDoc): boolean {
  const m = (doc.mimeType || '').toLowerCase();
  const n = doc.name.toLowerCase();
  if (isPdf(doc)) return true;
  if (m.startsWith('image/')) return true;
  if (m.startsWith('text/') || n.endsWith('.txt') || n.endsWith('.csv')) return true;
  return false;
}

function mimeForFile(file: File): string {
  if (file.type) return file.type;
  const n = file.name.toLowerCase();
  if (n.endsWith('.pdf')) return 'application/pdf';
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  if (n.endsWith('.gif')) return 'image/gif';
  if (n.endsWith('.webp')) return 'image/webp';
  if (n.endsWith('.txt')) return 'text/plain';
  if (n.endsWith('.csv')) return 'text/csv';
  return 'application/octet-stream';
}

async function resolveBlob(doc: TripDoc): Promise<Blob | null> {
  const blobId = doc.blobId || doc.id;
  const fromIdb = await getDocBlob(blobId);
  if (fromIdb) return fromIdb;
  if (doc.dataUrl) {
    try {
      const blob = dataUrlToBlob(
        doc.dataUrl,
        isPdf(doc) ? 'application/pdf' : doc.mimeType || 'application/octet-stream'
      );
      // Migrate legacy inline payload into IndexedDB
      await putDocBlob(blobId, doc.tripIdHint || '', doc.name, doc.mimeType || blob.type, blob);
      return blob;
    } catch {
      return null;
    }
  }
  if (doc.cloudUrl) {
    try {
      const res = await fetch(doc.cloudUrl);
      if (res.ok) return await res.blob();
    } catch {
      /* offline / CORS */
    }
  }
  return null;
}

async function openInBrowser(doc: TripDoc, toast?: (m: string) => void) {
  const blob = await resolveBlob(doc);
  if (!blob) {
    toast?.('File data is not available on this device');
    return;
  }
  const typed =
    isPdf(doc) && blob.type !== 'application/pdf' ? new Blob([blob], { type: 'application/pdf' }) : blob;
  const url = URL.createObjectURL(typed);
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win) window.location.href = url;
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function triggerDownload(doc: TripDoc, toast?: (m: string) => void) {
  const blob = await resolveBlob(doc);
  if (!blob) {
    toast?.('File data is not available on this device');
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = doc.name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

interface TripDocumentsPanelProps {
  trip: Trip;
  section: 'budget' | 'notes';
  onUpdateTrip: (updated: Trip, logAction?: { action: string; detail: string }) => void;
  onShowToast?: (msg: string) => void;
  title?: string;
}

export const TripDocumentsPanel: React.FC<TripDocumentsPanelProps> = ({
  trip,
  section,
  onUpdateTrip,
  onShowToast,
  title = 'Documents'
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const docs = (trip.documents || []).filter(d => d.section === section);

  const toast = (msg: string) => onShowToast?.(msg);

  const persist = (documents: TripDoc[], detail: string) => {
    // Never keep base64 in trip state going forward
    const slim = documents.map(({ dataUrl: _d, tripIdHint: _t, ...rest }) => rest as TripDoc);
    onUpdateTrip(
      { ...trip, documents: slim, updatedAt: Date.now() },
      { action: 'trip-documents', detail }
    );
  };

  // One-time migrate any legacy dataUrl docs into IndexedDB
  useEffect(() => {
    let cancelled = false;
    const legacy = (trip.documents || []).filter(d => d.dataUrl);
    if (!legacy.length) return;
    setMigrating(true);
    (async () => {
      try {
        for (const d of legacy) {
          const blobId = d.blobId || d.id;
          const existing = await getDocBlob(blobId);
          if (!existing && d.dataUrl) {
            const blob = dataUrlToBlob(d.dataUrl, d.mimeType || 'application/octet-stream');
            await putDocBlob(blobId, trip.id, d.name, d.mimeType || blob.type, blob);
          }
        }
        if (cancelled) return;
        const cleaned = (trip.documents || []).map(d => {
          const { dataUrl: _drop, ...rest } = d;
          return { ...rest, blobId: d.blobId || d.id } as TripDoc;
        });
        onUpdateTrip({ ...trip, documents: cleaned, updatedAt: Date.now() });
      } catch {
        /* keep inline until next visit */
      } finally {
        if (!cancelled) setMigrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id]);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || !fileList.length) return;
    setBusy(true);
    try {
      const next = [...(trip.documents || [])].map(({ dataUrl: _d, ...rest }) => rest as TripDoc);
      let added = 0;
      for (const file of Array.from(fileList)) {
        if (file.size > DOC_MAX_BYTES) {
          toast(`“${file.name}” is too large (max ${formatDocSize(DOC_MAX_BYTES)})`);
          continue;
        }
        const mime = mimeForFile(file);
        const id = uid('doc');
        try {
          await putDocBlob(id, trip.id, file.name, mime, file);
        } catch {
          toast(`Could not store “${file.name}” (browser storage full or blocked)`);
          continue;
        }
        next.push({
          id,
          blobId: id,
          name: file.name,
          mimeType: mime,
          size: file.size,
          section,
          createdAt: Date.now()
        });
        added++;
      }
      if (added) {
        persist(next, `Added ${added} document(s) on ${trip.name} (${section})`);
        toast(added === 1 ? 'Document saved on this device' : `${added} documents saved on this device`);
      }
    } catch {
      toast('Could not read that file');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async (id: string) => {
    const doc = (trip.documents || []).find(d => d.id === id);
    await deleteDocBlob(doc?.blobId || id);
    persist(
      (trip.documents || []).filter(d => d.id !== id),
      `Removed “${doc?.name || 'document'}” from ${trip.name}`
    );
  };

  return (
    <div className="chart-card" style={{ marginTop: title ? '16px' : 0 }}>
      {(title || true) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          {title ? <h3 style={{ margin: 0 }}>{title}</h3> : <span />}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              style={{ display: 'none' }}
              onChange={e => handleFiles(e.target.files)}
            />
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? 'Uploading…' : '+ Upload'}
            </button>
          </div>
        </div>
      )}
      <p style={{ fontSize: '11px', color: 'var(--ink-soft)', margin: '8px 0 0' }}>
        Files are stored in <strong>IndexedDB on this browser</strong> (up to {formatDocSize(DOC_MAX_BYTES)} each) so they
        no longer fill local trip data. PDFs and images open in a new tab. Cloud trip sync keeps file names only unless
        you add Firebase Storage later for cross-device files.
        {migrating ? ' Migrating older uploads…' : ''}
      </p>

      {docs.length === 0 ? (
        <div className="empty-state" style={{ marginTop: '12px' }}>
          No documents yet. Upload receipts, bookings, tickets or notes.
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {docs
            .slice()
            .sort((a, b) => b.createdAt - a.createdAt)
            .map(d => (
              <li
                key={d.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  background: 'var(--paper)',
                  border: '1px solid var(--paper-edge)',
                  borderRadius: '8px'
                }}
              >
                <span style={{ fontSize: '18px' }} aria-hidden>
                  {iconFor(d.mimeType, d.name)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                    {formatDocSize(d.size)} ·{' '}
                    {new Date(d.createdAt).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {d.cloudUrl ? ' · cloud' : ' · this device'}
                  </div>
                </div>
                {isBrowserViewable(d) && (
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    title={isPdf(d) ? 'Open PDF in browser' : 'Open in browser'}
                    onClick={() => openInBrowser(d, toast)}
                  >
                    Open
                  </button>
                )}
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  title="Download file"
                  onClick={() => triggerDownload(d, toast)}
                >
                  Download
                </button>
                <button type="button" className="exp-del" title="Remove" onClick={() => handleRemove(d.id)}>
                  ✕
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
};
