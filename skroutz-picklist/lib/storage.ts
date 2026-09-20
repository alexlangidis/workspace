import type { Product, StoredOrder } from "@/types/product";

export const ORDER_STORAGE_KEY = "picking-list-order-v1";

export function readStoredOrder(): StoredOrder | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(ORDER_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as StoredOrder;
    if (!parsed || !Array.isArray(parsed.products)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredOrder(order: StoredOrder): void {
  window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
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
