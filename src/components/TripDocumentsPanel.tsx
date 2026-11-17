import React, { useRef, useState } from 'react';
import { Trip, TripDoc } from '../types';
import { uid } from '../utils/helpers';

const MAX_BYTES = 2.5 * 1024 * 1024; // ~2.5 MB per file (localStorage-friendly)
const ACCEPT =
  '.pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx,.rtf,.pages,.heic';

function formatSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

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

/** Ensure data URLs for PDFs use application/pdf so the browser viewer kicks in */
function normalizeDataUrl(dataUrl: string, mimeHint: string): string {
  if (!dataUrl.startsWith('data:')) return dataUrl;
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return dataUrl;
  const meta = dataUrl.slice(5, comma); // after "data:"
  const payload = dataUrl.slice(comma + 1);
  const currentMime = meta.split(';')[0].toLowerCase();
  if (currentMime && currentMime !== 'application/octet-stream') return dataUrl;
  if (mimeHint) return `data:${mimeHint};${meta.includes('base64') ? 'base64' : ''},${payload}`.replace(';;', ';');
  return dataUrl;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const meta = parts[0] || '';
  const payload = parts.slice(1).join(',');
  const isBase64 = /;base64/i.test(meta);
  const mimeMatch = /^data:([^;,]*)/i.exec(meta);
  let mime = (mimeMatch && mimeMatch[1]) || 'application/octet-stream';
  if (!mime || mime === '') mime = 'application/octet-stream';

  let bytes: Uint8Array;
  if (isBase64) {
    const bin = atob(payload);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } else {
    const decoded = decodeURIComponent(payload);
    bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
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

/** Open PDF / image / text in a new tab via a blob URL (reliable in-browser viewer) */
function openInBrowser(doc: TripDoc) {
  let dataUrl = doc.dataUrl;
  if (isPdf(doc)) {
    dataUrl = normalizeDataUrl(dataUrl, 'application/pdf');
  }
  try {
    const blob = dataUrlToBlob(dataUrl);
    // Force PDF MIME even if stored as octet-stream
    const typed =
      isPdf(doc) && blob.type !== 'application/pdf'
        ? new Blob([blob], { type: 'application/pdf' })
        : blob;
    const url = URL.createObjectURL(typed);
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
      // Popup blocked — navigate top-level as fallback
      window.location.href = url;
    }
    // Revoke after the tab has had time to load
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    // Fallback: data URL navigation
    window.open(dataUrl, '_blank', 'noopener,noreferrer');
  }
}

function triggerDownload(doc: TripDoc) {
  const a = document.createElement('a');
  a.href = doc.dataUrl;
  a.download = doc.name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
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

  const docs = (trip.documents || []).filter(d => d.section === section);

  const toast = (msg: string) => onShowToast?.(msg);

  const persist = (documents: TripDoc[], detail: string) => {
    onUpdateTrip(
      { ...trip, documents, updatedAt: Date.now() },
      { action: 'trip-documents', detail }
    );
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || !fileList.length) return;
    setBusy(true);
    try {
      const next = [...(trip.documents || [])];
      for (const file of Array.from(fileList)) {
        if (file.size > MAX_BYTES) {
          toast(`“${file.name}” is too large (max ${formatSize(MAX_BYTES)})`);
          continue;
        }
        const mime = mimeForFile(file);
        let dataUrl = await readAsDataUrl(file);
        // Rewrite MIME in data URL when the browser left it empty / generic
        dataUrl = normalizeDataUrl(dataUrl, mime);
        if (mime === 'application/pdf' && !dataUrl.startsWith('data:application/pdf')) {
          const comma = dataUrl.indexOf(',');
          if (comma > 0) {
            const payload = dataUrl.slice(comma + 1);
            dataUrl = `data:application/pdf;base64,${payload}`;
          }
        }
        next.push({
          id: uid('doc'),
          name: file.name,
          mimeType: mime,
          size: file.size,
          section,
          dataUrl,
          createdAt: Date.now()
        });
      }
      if (next.length !== (trip.documents || []).length) {
        persist(next, `Added document(s) on ${trip.name} (${section})`);
        toast('Document saved');
      }
    } catch {
      toast('Could not read that file');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = (id: string) => {
    const doc = (trip.documents || []).find(d => d.id === id);
    persist(
      (trip.documents || []).filter(d => d.id !== id),
      `Removed “${doc?.name || 'document'}” from ${trip.name}`
    );
  };

  return (
    <div className="chart-card" style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
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
      <p style={{ fontSize: '11px', color: 'var(--ink-soft)', margin: '8px 0 0' }}>
        PDFs open in a new browser tab. Images and text open in-browser too. Other files can be downloaded.
        Max {formatSize(MAX_BYTES)} each — stored with this trip.
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
                    {formatSize(d.size)} ·{' '}
                    {new Date(d.createdAt).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                {isBrowserViewable(d) ? (
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    title={isPdf(d) ? 'Open PDF in browser' : 'Open in browser'}
                    onClick={() => openInBrowser(d)}
                  >
                    Open
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  title="Download file"
                  onClick={() => triggerDownload(d)}
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

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('read failed'));
    reader.readAsDataURL(file);
  });
}
