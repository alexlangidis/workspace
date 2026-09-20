export type Product = {
  id: string;
  category: string;
  title: string;
  mpn: string;
  ean: string;
  quantity: number;
  pickedQuantity: number;
  image?: string;
  originalIndex: number;
};

export type StoredOrder = {
  products: Product[];
  sourceName: string;
  parsedAt: string;
};
