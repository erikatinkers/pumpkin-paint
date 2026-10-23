/**
 * Keeps the painting between visits, in the browser's own storage (IndexedDB: localStorage is too small and blocks the page). One record holds the color
 * and roughness layers as PNGs. Everything here can fail (private windows, storage turned off or full), so callers treat a failure as "nothing saved".
 */
export interface SavedPaint {
  /** PNG bytes of each layer. */
  color: ArrayBuffer;
  roughness: ArrayBuffer;
  /** The texture size the layers were saved at, so a different size can be scaled on the way back. */
  width: number;
  height: number;
  savedAt: number;
}

const DB_NAME = "pumpkin-paint";
const STORE = "paint";
const KEY = "current";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = work(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** The saved painting, or undefined if there is none or storage is not available. */
export async function loadPaint(): Promise<SavedPaint | undefined> {
  try {
    return await run<SavedPaint | undefined>("readonly", (s) => s.get(KEY));
  } catch {
    return undefined;
  }
}

/** Replaces the saved painting. Rejects if it could not be written. */
export async function savePaint(paint: SavedPaint): Promise<void> {
  await run("readwrite", (s) => s.put(paint, KEY));
}
