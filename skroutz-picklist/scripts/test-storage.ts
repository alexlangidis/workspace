import assert from "node:assert/strict";
import { test } from "node:test";
import { clearStoredOrder, ORDER_STORAGE_KEY, readStoredOrder, stockListStorage, storageErrorMessage, writeStoredOrder } from "../lib/storage";
import type { StoredOrder } from "../types/product";

// Deterministic transaction fake: requests finish before commits, and aborts
// must never publish data. Browser checks additionally exercise real IndexedDB.
const records = new Map<string, unknown>();
const legacy = new Map<string, string>();
let abortNextWrite = false;
let webStorageDisabled = false;
const quotaError = new DOMException("The quota has been exceeded.", "QuotaExceededError");

const database = {
  close() {},
  transaction(_store: string, mode: string) {
    const pending = new Map(records);
    const abort = mode === "readwrite" && abortNextWrite;
    if (mode === "readwrite") abortNextWrite = false;
    const tx = {
      error: abort ? quotaError : null,
      oncomplete: null as (() => void) | null,
      onabort: null as (() => void) | null,
      objectStore() {
        return {
          get(key: string) { return { result: structuredClone(pending.get(key)), error: null }; },
          put(value: unknown, key: string) { pending.set(key, structuredClone(value)); return { result: key, error: null }; },
          delete(key: string) { pending.delete(key); return { result: undefined, error: null }; },
        };
      },
    };
    setTimeout(() => {
      if (abort) tx.onabort?.();
      else {
        if (mode === "readwrite") {
          records.clear();
          pending.forEach((value, key) => records.set(key, value));
        }
        tx.oncomplete?.();
      }
    }, 0);
    return tx;
  },
};

Object.defineProperty(globalThis, "window", {
  value: {
    indexedDB: {
      open() {
        const request = { result: database, onsuccess: null as (() => void) | null };
        setTimeout(() => request.onsuccess?.(), 0);
        return request;
      },
    },
    localStorage: {
      getItem(key: string) { if (webStorageDisabled) throw quotaError; return legacy.get(key) ?? null; },
      removeItem(key: string) { if (webStorageDisabled) throw quotaError; legacy.delete(key); },
      setItem() { throw quotaError; },
    },
  },
});

const order: StoredOrder = {
  warnings: [{ productTitle: "Skipped product", message: "Δεν διαβάστηκε το EAN." }],
  sourceName: "fixture.pdf", parsedAt: "2026-10-05T12:00:00Z",
  products: [{ id: "1", title: "Product", category: "Category", mpn: "MPN", ean: "5900000000000", quantity: 2, pickedQuantity: 1, originalIndex: 0, image: `data:image/png;base64,${"A".repeat(6 * 1024 * 1024)}` }],
};

test("large image-heavy orders save even when Web Storage is unavailable", async () => {
  webStorageDisabled = true;
  await writeStoredOrder(order);
  assert.deepEqual(await readStoredOrder(), order);
  webStorageDisabled = false;
});

test("legacy migration preserves progress and only removes the old copy after commit", async () => {
  records.clear();
  legacy.set(ORDER_STORAGE_KEY, JSON.stringify(order));
  abortNextWrite = true;
  await assert.rejects(readStoredOrder(), { name: "QuotaExceededError" });
  assert.equal(records.size, 0);
  assert.ok(legacy.has(ORDER_STORAGE_KEY));
  assert.deepEqual(await readStoredOrder(), order);
  assert.equal(legacy.has(ORDER_STORAGE_KEY), false);
});

test("aborted saves retain the previous order and can be retried", async () => {
  const next = { ...order, sourceName: "replacement.pdf" };
  abortNextWrite = true;
  await assert.rejects(writeStoredOrder(next), { name: "QuotaExceededError" });
  assert.deepEqual(await readStoredOrder(), order);
  await writeStoredOrder(next);
  assert.deepEqual(await readStoredOrder(), next);
});

test("rapid saves and deletion commit in order without resurrecting an old list", async () => {
  await Promise.all([writeStoredOrder(order), writeStoredOrder({ ...order, sourceName: "latest.pdf" }), clearStoredOrder()]);
  assert.equal(await readStoredOrder(), null);
});

test("quota errors have an actionable Greek message", () => {
  assert.match(storageErrorMessage(quotaError), /χώρος/);
});

test("XLSX saves and deletion leave the active PDF order and legacy migration intact", async () => {
  records.clear();
  legacy.set(ORDER_STORAGE_KEY, JSON.stringify(order));
  const stockList: StoredOrder = {
    sourceName: "stock.xlsx",
    parsedAt: order.parsedAt,
    products: [{ id: "stock-1", title: "Stock product", category: "Stock", mpn: "", ean: "0590000000000", quantity: 3, pickedQuantity: 2, originalIndex: 0 }],
  };

  await stockListStorage.write(stockList);
  assert.ok(legacy.has(ORDER_STORAGE_KEY));
  assert.deepEqual(await readStoredOrder(), order);
  assert.deepEqual(await stockListStorage.read(), stockList);

  await stockListStorage.clear();
  assert.equal(await stockListStorage.read(), null);
  assert.deepEqual(await readStoredOrder(), order);
});
