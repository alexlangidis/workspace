import type { Product, StoredOrder } from "@/types/product";

export const ORDER_STORAGE_KEY = "picking-list-order-v1";

const DATABASE_NAME = "skroutz-picklist";
const STORE_NAME = "orders";
const ACTIVE_ORDER = "active";
let operations: Promise<unknown> = Promise.resolve();

// Keep saves and deletion ordered, even when scans arrive rapidly.
function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = operations.then(operation);
  operations = result.catch(() => undefined);
  return result;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let blocked = false;
    const request = window.indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      blocked = true;
      reject(new Error("Κλείσε τις άλλες καρτέλες της εφαρμογής και δοκίμασε ξανά."));
    };
    request.onsuccess = () => {
      if (blocked) request.result.close();
      else resolve(request.result);
    };
  });
}

async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, mode);
      const request = action(tx.objectStore(STORE_NAME));
      // Request success is not enough: wait until the write actually commits.
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(tx.error ?? request.error ?? new Error("Η αποθήκευση διακόπηκε."));
      tx.onerror = () => reject(tx.error ?? request.error);
    });
  } finally {
    database.close();
  }
}

function removeLegacyOrder() {
  // A disabled Web Storage API must not prevent IndexedDB saves.
  try { window.localStorage.removeItem(ORDER_STORAGE_KEY); } catch { /* optional cleanup */ }
}

export function storageErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return "Δεν υπάρχει αρκετός διαθέσιμος χώρος για τη λίστα. Ελευθέρωσε χώρο στη συσκευή και δοκίμασε ξανά. Μην διαγράψεις τα δεδομένα της εφαρμογής αν έχεις ενεργή παραγγελία.";
  }
  return "Δεν ήταν δυνατή η τοπική αποθήκευση. Δοκίμασε ξανά ή άνοιξε την εφαρμογή σε κανονική καρτέλα του Safari/browser, χωρίς ιδιωτική περιήγηση.";
}

export function readStoredOrder(): Promise<StoredOrder | null> {
  return enqueue(async () => {
    const order = await transaction<StoredOrder | undefined>("readonly", store => store.get(ACTIVE_ORDER));
    if (order && Array.isArray(order.products)) return order;
    let legacy: StoredOrder | null = null;
    // Preserve old orders until migration has committed successfully.
    try {
      const stored = window.localStorage.getItem(ORDER_STORAGE_KEY);
      if (stored) legacy = JSON.parse(stored) as StoredOrder;
    } catch { /* no readable legacy order */ }
    if (!legacy || !Array.isArray(legacy.products)) return null;
    await transaction("readwrite", store => store.put(legacy, ACTIVE_ORDER));
    removeLegacyOrder();
    return legacy;
  });
}

export function writeStoredOrder(order: StoredOrder): Promise<void> {
  return enqueue(async () => {
    await transaction("readwrite", store => store.put(order, ACTIVE_ORDER));
    removeLegacyOrder();
  });
}

export function clearStoredOrder(): Promise<void> {
  return enqueue(async () => {
    await transaction("readwrite", store => store.delete(ACTIVE_ORDER));
    removeLegacyOrder();
  });
}

export function withPickedQuantity(products: Product[], id: string, pickedQuantity: number): Product[] {
  return products.map((product) =>
    product.id === id
      ? {
          ...product,
          pickedQuantity: Math.max(0, Math.min(product.quantity, pickedQuantity)),
        }
      : product,
  );
}
