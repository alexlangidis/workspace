export type Product = {
  id: string;
  category: string;
  title: string;
  mpn: string;
  ean: string;
  quantity: number;
  marketplaceStock?: number;
  pickedQuantity: number;
  completedManually?: boolean;
  removedFromStockList?: boolean;
  image?: string;
  originalIndex: number;
};

export type StoredOrder = {
  warnings?: ParseWarning[];
  products: Product[];
  sourceName: string;
  parsedAt: string;
};

export type ParseWarning = { productTitle: string; message: string };
