'use client';
import type { QueuedRequest, QueueStore } from './queue';

/** QueueStore respaldado por IndexedDB (solo navegador). */
const DB = 'keivis-offline';
const STORE = 'queue';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const r = fn(t.objectStore(STORE));
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      }),
  );
}

export const idbQueueStore: QueueStore = {
  async add(req) {
    await tx('readwrite', (s) => s.add(req));
  },
  async all() {
    return (await tx<QueuedRequest[]>('readonly', (s) => s.getAll() as IDBRequest<QueuedRequest[]>)) ?? [];
  },
  async remove(id) {
    await tx('readwrite', (s) => s.delete(id));
  },
  async update(req) {
    await tx('readwrite', (s) => s.put(req));
  },
};
