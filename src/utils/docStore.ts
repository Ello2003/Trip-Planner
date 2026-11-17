/** IndexedDB blob store for trip documents (keeps localStorage lean). */

const DB_NAME = 'travel-ledger-docs-v1';
const STORE = 'blobs';
const DB_VERSION = 1;

export const DOC_MAX_BYTES = 40 * 1024 * 1024; // 40 MB per file in IndexedDB

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
  return dbPromise;
}

export type DocBlobRecord = {
  id: string;
  tripId: string;
  mimeType: string;
  name: string;
  blob: Blob;
  updatedAt: number;
};

export async function putDocBlob(
  id: string,
  tripId: string,
  name: string,
  mimeType: string,
  blob: Blob
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('put failed'));
    tx.objectStore(STORE).put({
      id,
      tripId,
      name,
      mimeType,
      blob,
      updatedAt: Date.now()
    } satisfies DocBlobRecord);
  });
}

export async function getDocBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => {
        const row = req.result as DocBlobRecord | undefined;
        resolve(row?.blob || null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function deleteDocBlob(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('delete failed'));
      tx.objectStore(STORE).delete(id);
    });
  } catch {
    /* ignore */
  }
}

export async function deleteDocBlobsForTrip(tripId: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        const row = cursor.value as DocBlobRecord;
        if (row.tripId === tripId) cursor.delete();
        cursor.continue();
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('scan failed'));
    });
  } catch {
    /* ignore */
  }
}

export function dataUrlToBlob(dataUrl: string, mimeFallback = 'application/octet-stream'): Blob {
  const parts = dataUrl.split(',');
  const meta = parts[0] || '';
  const payload = parts.slice(1).join(',');
  const isBase64 = /;base64/i.test(meta);
  const mimeMatch = /^data:([^;,]*)/i.exec(meta);
  let mime = (mimeMatch && mimeMatch[1]) || mimeFallback;
  if (!mime) mime = mimeFallback;

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

export function formatDocSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Metadata-only documents for localStorage / cloud JSON (no base64). */
export function slimDocumentsForPersist<T extends { dataUrl?: string }>(docs: T[] | undefined): T[] {
  if (!Array.isArray(docs)) return [];
  return docs.map(d => {
    const { dataUrl: _drop, ...rest } = d as T & { dataUrl?: string };
    return rest as T;
  });
}
