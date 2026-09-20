import fs from "node:fs/promises";
import path from "node:path";
import { parseOrderPdf } from "../lib/pdf/parseOrderPdf";

async function main() {
  const filePath = path.join(process.cwd(), "samples", "Παραγγελίες προς αποστολή.pdf");
  const products = await parseOrderPdf(new Uint8Array(await fs.readFile(filePath)));

  console.log(`Extracted ${products.length} products and ${products.reduce((sum, product) => sum + product.quantity, 0)} units.`);
  for (const product of products) {
    console.log(JSON.stringify({ category: product.category, title: product.title, mpn: product.mpn, ean: product.ean, quantity: product.quantity }));
  }
}

void main();
