import { initFirebaseAdmin } from './firebase-admin';

export type DocData = Record<string, unknown>;

interface QueryFilter {
  field: string;
  op: '==' | '<=' | '>=' | 'array-contains';
  value: unknown;
}

interface QueryOptions {
  filters?: QueryFilter[];
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  limit?: number;
}

// In-memory store — only when USE_DEV_STORE=true
const memoryStore = new Map<string, Map<string, DocData>>();

function memCollection(name: string): Map<string, DocData> {
  if (!memoryStore.has(name)) memoryStore.set(name, new Map());
  return memoryStore.get(name)!;
}

/** True only when explicitly opted into local in-memory storage. */
export function isDevStore(): boolean {
  return process.env.USE_DEV_STORE === 'true';
}

export function getStorageMode(): 'memory' | 'firestore' {
  return isDevStore() ? 'memory' : 'firestore';
}

function getFirestore(): FirebaseFirestore.Firestore {
  if (isDevStore()) {
    throw new Error('getFirestore() called while USE_DEV_STORE=true');
  }

  const fb = initFirebaseAdmin();
  if (!fb) {
    throw new Error(
      'Firestore is not configured. Download a Firebase service account key from ' +
        'Firebase Console → Project settings → Service accounts → Generate new private key, ' +
        'save it as firebase-service-account.json at the repo root, and set USE_DEV_STORE=false. ' +
        'See docs/FIREBASE_SETUP.md'
    );
  }

  return fb.firestore();
}

function sortDocItems(
  items: DocData[],
  orderBy: { field: string; direction: 'asc' | 'desc' }
): DocData[] {
  const { field, direction } = orderBy;
  return [...items].sort((a, b) => {
    const av = String(a[field] ?? '');
    const bv = String(b[field] ?? '');
    return direction === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv);
  });
}

function applyFilters(items: DocData[], filters: QueryFilter[]): DocData[] {
  let result = items;
  for (const f of filters) {
    result = result.filter((doc) => {
      const val = doc[f.field];
      if (f.op === '==') return val === f.value;
      if (f.op === '<=') return (val as string) <= (f.value as string);
      if (f.op === '>=') return (val as string) >= (f.value as string);
      return true;
    });
  }
  return result;
}

function isFirestoreIndexError(err: unknown): boolean {
  const code = (err as { code?: number }).code;
  const message = (err as { message?: string }).message || '';
  return code === 9 || message.includes('FAILED_PRECONDITION') || message.includes('requires an index');
}

/** Call at startup to fail fast when Firestore mode is requested without credentials. */
export async function assertFirestoreReady(): Promise<void> {
  if (isDevStore()) return;

  const firestore = getFirestore();
  await firestore.collection('_health').doc('ping').set(
    { checkedAt: new Date().toISOString() },
    { merge: true }
  );
}

export const db = {
  async get(collection: string, id: string): Promise<DocData | null> {
    if (isDevStore()) {
      const doc = memCollection(collection).get(id);
      return doc ? { id, ...doc } : null;
    }
    const snap = await getFirestore().collection(collection).doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as DocData;
  },

  async set(collection: string, id: string, data: DocData): Promise<void> {
    const payload = { ...data, id };
    if (isDevStore()) {
      memCollection(collection).set(id, payload);
      return;
    }
    await getFirestore().collection(collection).doc(id).set(data, { merge: true });
  },

  async update(collection: string, id: string, data: Partial<DocData>): Promise<void> {
    if (isDevStore()) {
      const existing = memCollection(collection).get(id) || {};
      memCollection(collection).set(id, { ...existing, ...data, id });
      return;
    }
    await getFirestore().collection(collection).doc(id).update(data);
  },

  async delete(collection: string, id: string): Promise<void> {
    if (isDevStore()) {
      memCollection(collection).delete(id);
      return;
    }
    await getFirestore().collection(collection).doc(id).delete();
  },

  async query(collection: string, options: QueryOptions = {}): Promise<DocData[]> {
    if (isDevStore()) {
      let items = Array.from(memCollection(collection).values());
      for (const f of options.filters || []) {
        items = items.filter((doc) => {
          const val = doc[f.field];
          if (f.op === '==') return val === f.value;
          if (f.op === '<=') return (val as string) <= (f.value as string);
          if (f.op === '>=') return (val as string) >= (f.value as string);
          return true;
        });
      }
      if (options.orderBy) {
        items = sortDocItems(items, options.orderBy);
      }
      if (options.limit) items = items.slice(0, options.limit);
      return items.map((d) => ({ ...d, id: d.id as string }));
    }

    const filters = options.filters || [];
    const tenantFilter = filters.find((f) => f.field === 'tenantId' && f.op === '==');
    const userFilter = filters.find((f) => f.field === 'userId' && f.op === '==');
    const memoryFilters = filters.filter((f) => f !== tenantFilter && f !== userFilter);

    // Use a single Firestore equality filter to avoid composite indexes (building or missing).
    const primaryFilter = tenantFilter || userFilter || (filters.length === 1 ? filters[0] : null);
    const fetchCap = Math.min(Math.max((options.limit || 50) * 20, 200), 1000);

    const finish = (items: DocData[]) => {
      let result = applyFilters(items, memoryFilters);
      if (options.orderBy) result = sortDocItems(result, options.orderBy);
      if (options.limit) result = result.slice(0, options.limit);
      return result;
    };

    const runQuery = async (): Promise<DocData[]> => {
      let q: FirebaseFirestore.Query = getFirestore().collection(collection);
      if (primaryFilter) {
        q = q.where(primaryFilter.field, primaryFilter.op, primaryFilter.value);
      }
      const snap = await q.limit(fetchCap).get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as DocData[];
    };

    const runFallback = async (): Promise<DocData[]> => {
      const snap = await getFirestore().collection(collection).limit(fetchCap).get();
      return applyFilters(
        snap.docs.map((d) => ({ id: d.id, ...d.data() })) as DocData[],
        filters
      );
    };

    try {
      return finish(await runQuery());
    } catch (err) {
      if (!isFirestoreIndexError(err)) throw err;
      console.warn(`[db] index fallback for ${collection}:`, (err as Error).message);
      let items = await runFallback();
      if (options.orderBy) items = sortDocItems(items, options.orderBy);
      if (options.limit) items = items.slice(0, options.limit);
      return items;
    }
  },

  async count(collection: string, filters?: QueryFilter[]): Promise<number> {
    const items = await this.query(collection, { filters });
    return items.length;
  },
};
