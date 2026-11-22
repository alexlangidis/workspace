import type { CellValue, Sheet } from "read-excel-file/browser";
import type { ParseWarning, Product } from "@/types/product";

export const XLSX_MAX_BYTES = 20 * 1024 * 1024;
export const XLSX_DEFAULT_CATEGORY = "Προϊόντα για συλλογή";

const requiredHeaders = ["ean", "name", "marketplace stock"];
const missingHeaders = "Το XLSX πρέπει να έχει τις στήλες EAN, Name και Marketplace stock στην πρώτη γραμμή ενός φύλλου.";

function readInteger(value: CellValue | null | undefined) {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

function readEan(value: CellValue | null | undefined) {
  const text = typeof value === "string" ? value.trim() : String(readInteger(value) ?? "");
  return /^\d{8,14}$/.test(text) ? text : null;
}

export function parseStockSheets(sheets: Sheet[]): { products: Product[]; warnings: ParseWarning[] } {
  const matchingSheets = sheets.flatMap(({ data }) => {
    const header = data[0] ?? [];
    const names = header.map((value) => typeof value === "string" ? value.trim().toLowerCase().replace(/\s+/g, " ") : "");
    const columns = requiredHeaders.map((name) => names.indexOf(name));
    return columns.every((index) => index >= 0) ? [{ data, names, columns }] : [];
  });

  if (!matchingSheets.length) throw new Error(missingHeaders);
  if (matchingSheets.length > 1) throw new Error("Βρέθηκαν πολλά φύλλα με τις απαιτούμενες στήλες. Κράτησε ένα φύλλο προϊόντων στο XLSX.");
  const { data, names, columns: [eanColumn, nameColumn, stockColumn] } = matchingSheets[0];
  const categoryColumn = names.indexOf("category");
  if (requiredHeaders.some((name) => names.indexOf(name) !== names.lastIndexOf(name))) {
    throw new Error("Οι στήλες EAN, Name και Marketplace stock πρέπει να εμφανίζονται μία φορά η καθεμία.");
  }

  const products: Product[] = [];
  const warnings: ParseWarning[] = [];
  for (const [index, row] of data.slice(1).entries()) {
    if (row.every((value) => value === null || value === "")) continue;
    const stock = readInteger(row[stockColumn]);
    if (stock === 0) continue;
    const rawName = row[nameColumn];
    const title = typeof rawName === "string" ? rawName.trim() : "";
    const ean = readEan(row[eanColumn]);
    if (!ean || !title || stock === null || stock < 0) {
      const invalid = [!ean && "EAN", !title && "Name", (stock === null || stock < 0) && "Marketplace stock"].filter(Boolean);
      warnings.push({ productTitle: `Γραμμή ${index + 2}`, message: `Μη έγκυρα πεδία: ${invalid.join(", ")}.` });
      continue;
    }
    const categoryCell = categoryColumn >= 0 ? row[categoryColumn] : null;
    const category = typeof categoryCell === "string" ? categoryCell.trim() : "";
    products.push({
      id: `xlsx-${index}`,
      category: categoryColumn < 0 ? XLSX_DEFAULT_CATEGORY : category || "Χωρίς κατηγορία",
      title,
      mpn: "",
      ean,
      quantity: stock,
      marketplaceStock: stock,
      pickedQuantity: 0,
      originalIndex: index,
    });
  }

  if (!products.length) {
    const firstWarning = warnings[0];
    throw new Error(firstWarning ? `${firstWarning.productTitle} · ${firstWarning.message}` : "Δεν υπάρχουν προϊόντα με θετικό Marketplace stock στο XLSX.");
  }
  return { products, warnings };
}
