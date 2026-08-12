// ============================================================================
// DJ-JK — Local-first storage layer (Phase 1)
//
// Native IndexedDB (zero dependencies) — low-level, fast and resilient on
// modest hardware, per the owner's "low-level first" principle. This is the
// D5 "universal slot" primitive: any asset (builtin, custom, AI-generated,
// recorded) is a `SoundboardSlot` stored here, and any slot is reusable
// anywhere — as a background layer, a one-shot, a loop, or a cue in a live DJ set.
//
// The server becomes *optional* (cloud sync / collaboration / cloud AI); the
// studio's core always works offline with no account.
// ============================================================================

// --- Universal slot model (D5) ---
export type SlotSource = "builtin" | "custom" | "ai" | "recorded";

export interface SoundboardSlot {
  id: string;
  name: string;
  category: string; // Drops | FX | Vocals | Bass | Drums | Custom
  color: string; // hex accent for the slot
  audioData: string; // `data:` URL, `builtin:` ref, or `ai:<generationId>`
  source: SlotSource;
  createdAt: number; // epoch ms
  bpm?: number;
  key?: string;
  /** When set, the slot is a generative snippet usable as a background/song layer. */
  isSongLayer?: boolean;
}

export interface SavedSet {
  id: string;
  name: string;
  slots: SoundboardSlot[];
  savedAt: number;
  mode: "studio" | "vr";
}

// --- IndexedDB setup ---
const DB_NAME = "dj-jk-local";
const DB_VERSION = 1;
const STORE_SOUNDBOARD = "soundboard"; // SoundboardSlot[]
const STORE_SETS = "sets"; // SavedSet[]
const STORE_KV = "kv"; // small key/value metadata

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB is not available in this environment."));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_SOUNDBOARD)) {
          db.createObjectStore(STORE_SOUNDBOARD, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_SETS)) {
          db.createObjectStore(STORE_SETS, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_KV)) {
          db.createObjectStore(STORE_KV, { keyPath: "key" });
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("Failed to open IndexedDB"));
    });
  }
  return dbPromise;
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await openDB();
  return new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result: T | undefined;
    try {
      const req = fn(store);
      if (req) {
        req.onsuccess = () => {
          result = req.result;
        };
        req.onerror = () => reject(req.error);
      }
    } catch (err) {
      reject(err);
      return;
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// --- Generic helpers ---
export async function putRecord<T>(storeName: string, value: T): Promise<void> {
  await withStore(storeName, "readwrite", (s) => s.put(value as never));
}

export async function getRecord<T>(storeName: string, key: string): Promise<T | undefined> {
  return withStore<T>(storeName, "readonly", (s) => s.get(key) as IDBRequest<T>);
}

export async function getAllRecords<T>(storeName: string): Promise<T[]> {
  return (await withStore<T[]>(storeName, "readonly", (s) => s.getAll() as IDBRequest<T[]>)) ?? [];
}

export async function deleteRecord(storeName: string, key: string): Promise<void> {
  await withStore(storeName, "readwrite", (s) => s.delete(key));
}

export async function clearStore(storeName: string): Promise<void> {
  await withStore(storeName, "readwrite", (s) => s.clear());
}

// --- Domain: soundboard (universal slots) ---
export const soundboardStore = {
  async load(): Promise<SoundboardSlot[]> {
    try {
      return (await getAllRecords<SoundboardSlot>(STORE_SOUNDBOARD)) ?? [];
    } catch {
      return [];
    }
  },
  async saveAll(slots: SoundboardSlot[]): Promise<void> {
    await clearStore(STORE_SOUNDBOARD);
    for (const slot of slots) {
      await putRecord(STORE_SOUNDBOARD, slot);
    }
  },
  async add(slot: SoundboardSlot): Promise<void> {
    await putRecord(STORE_SOUNDBOARD, slot);
  },
  async remove(id: string): Promise<void> {
    await deleteRecord(STORE_SOUNDBOARD, id);
  },
  async clear(): Promise<void> {
    await clearStore(STORE_SOUNDBOARD);
  },
};

// --- Domain: saved sets / sessions ---
export const setStore = {
  async load(): Promise<SavedSet[]> {
    try {
      return (await getAllRecords<SavedSet>(STORE_SETS)) ?? [];
    } catch {
      return [];
    }
  },
  async save(set: SavedSet): Promise<void> {
    await putRecord(STORE_SETS, set);
  },
  async remove(id: string): Promise<void> {
    await deleteRecord(STORE_SETS, id);
  },
};

// --- Domain: simple key/value metadata ---
export const kv = {
  async get(key: string): Promise<string | null> {
    const row = await getRecord<{ key: string; value: string }>(STORE_KV, key);
    return row?.value ?? null;
  },
  async set(key: string, value: string): Promise<void> {
    await putRecord(STORE_KV, { key, value });
  },
  async remove(key: string): Promise<void> {
    await deleteRecord(STORE_KV, key);
  },
};

/** True when IndexedDB is usable (guards SSR / very old browsers). */
export function isLocalStorageAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}
