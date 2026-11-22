import type { Product } from "@/types/product";

export function isProductComplete(product: Product): boolean {
  return product.completedManually === true || product.pickedQuantity === product.quantity;
}
