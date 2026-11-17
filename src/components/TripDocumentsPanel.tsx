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
        const dataUrl = await readAsDataUrl(file);
        next.push({
          id: uid('doc'),
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
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
        PDFs, images, spreadsheets and office docs — up to {formatSize(MAX_BYTES)} each. Stored with this trip on this device
        (and in cloud backup if you sync).
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
                    {formatSize(d.size)} · {new Date(d.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <a
                  className="btn-ghost btn-sm"
                  href={d.dataUrl}
                  download={d.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open or download"
                >
                  Open
                </a>
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
