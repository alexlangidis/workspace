import assert from "node:assert/strict";
import { test } from "node:test";
import { inflateSync } from "node:zlib";
import { parseOrderPdf, parseProductsFromTextLines, PdfOrderParseError } from "../lib/pdf/parseOrderPdf";

type Text = { text: string; x: number; y: number };
type Photo = { y: number; color: [number, number, number] };

// Minimal PDFs exercise the real PDF.js text/image operators, including page breaks.
function fixture(pages: Array<{ text: Text[]; photos: Photo[] }>): Uint8Array {
  const objects: Buffer[] = [];
  const add = (value: string | Buffer) => { objects.push(Buffer.from(value)); return objects.length; };
  const stream = (dictionary: string, data: Buffer) => Buffer.concat([Buffer.from(`<< ${dictionary} /Length ${data.length} >>\nstream\n`), data, Buffer.from("\nendstream")]);
  add("");
  add("");
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds: number[] = [];
  for (const page of pages) {
    const images = page.photos.map((photo) => add(stream("/Type /XObject /Subtype /Image /Width 6 /Height 6 /ColorSpace /DeviceRGB /BitsPerComponent 8", Buffer.from(Array.from({ length: 36 }, () => photo.color).flat()))));
    const content = [
      ...page.text.map(({ text, x, y }) => `BT /F1 11 Tf 1 0 0 1 ${x} ${y} Tm (${text.replace(/[\\()]/g, "\\$&")}) Tj ET`),
      ...page.photos.map((photo, i) => `q 60 0 0 60 40 ${photo.y} cm /Photo${i} Do Q`),
    ].join("\n");
    const contents = add(stream("", Buffer.from(content)));
    pageIds.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R >> /XObject << ${images.map((id, i) => `/Photo${i} ${id} 0 R`).join(" ")} >> >> /Contents ${contents} 0 R >>`));
  }
  objects[0] = Buffer.from("<< /Type /Catalog /Pages 2 0 R >>");
  objects[1] = Buffer.from(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
  const chunks = [Buffer.from("%PDF-1.4\n")];
  const offsets = [0];
  let offset = chunks[0].length;
  objects.forEach((object, i) => {
    offsets.push(offset);
    const chunk = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`), object, Buffer.from("\nendobj\n")]);
    chunks.push(chunk);
    offset += chunk.length;
  });
  chunks.push(Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(value => `${String(value).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`));
  return new Uint8Array(Buffer.concat(chunks));
}

function firstPixel(image: string | undefined) {
  assert.ok(image);
  const png = Buffer.from(image.split(",")[1], "base64");
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    if (png.toString("ascii", offset + 4, offset + 8) === "IDAT") return Array.from(inflateSync(png.subarray(offset + 8, offset + 8 + length)).subarray(1, 4));
    offset += 12 + length;
  }
  assert.fail("Missing PNG image data");
}

test("category words and uppercase text inside titles do not become categories", () => {
  const products = parseProductsFromTextLines([
    "Αξεσουάρ Διαδραστικού Gaming", "Προϊόν Ποσότητα",
    "Nintendo Switch Σετ Αξεσουάρ", "MPN: NINTENDO", "EAN: 5907769384547", "1 ×",
    "USB C CHARGER", "MPN: 1234567890123", "EAN: 5907769300684", "2 ×",
  ]);
  assert.equal(products.length, 2);
  assert.equal(products[0].category, "Αξεσουάρ Διαδραστικού Gaming");
  assert.equal(products[0].title, "Nintendo Switch Σετ Αξεσουάρ");
  assert.equal(products[1].title, "USB C CHARGER");
  assert.equal(products[1].mpn, "1234567890123");
});

test("quantity between title lines and repeated page headers preserve the complete title", () => {
  const [product] = parseProductsFromTextLines([
    "Λουράκια Wearables", "Προϊόν Ποσότητα",
    "Techsuit Watchband Huawei Watch Fit", "1 ×",
    "Λουράκια Wearables", "Προϊόν Ποσότητα", "5 Pro - Plum",
    "MPN:", "KF-5949419373785", "EAN: 594941937", "3785",
  ]);
  assert.equal(product.title, "Techsuit Watchband Huawei Watch Fit 5 Pro - Plum");
  assert.equal(product.ean, "5949419373785");
  assert.equal(product.quantity, 1);
});

test("photo coordinates survive missing photos and reversed image operator order", async () => {
  const text: Text[] = [];
  for (const [index, y] of [740, 620, 500].entries()) {
    text.push({ text: index === 0 ? "Screen 10 x 20 cm" : `Product ${index}`, x: 120, y });
    text.push({ text: `MPN: CODE-${index}`, x: 120, y: y - 18 });
    text.push({ text: `EAN: 590776930068${index}`, x: 120, y: y - 40 });
    text.push({ text: "1 x", x: 500, y: y - 18 });
  }
  const products = await parseOrderPdf(fixture([{ text, photos: [{ y: 455, color: [0, 0, 255] }, { y: 695, color: [255, 0, 0] }] }]));
  assert.equal(products.length, 3);
  assert.equal(products[0].title, "Screen 10 x 20 cm");
  assert.equal(products[0].quantity, 1);
  assert.deepEqual(firstPixel(products[0].image), [255, 0, 0]);
  assert.equal(products[1].image, undefined);
  assert.deepEqual(firstPixel(products[2].image), [0, 0, 255]);
});

test("a row split across two physical PDF pages retains its metadata and photo", async () => {
  const products = await parseOrderPdf(fixture([
    { text: [{ text: "Watchband first part", x: 120, y: 60 }, { text: "MPN: BAND-1", x: 120, y: 40 }], photos: [{ y: 20, color: [0, 255, 0] }] },
    { text: [
      { text: "EAN: 5949419373785", x: 120, y: 760 }, { text: "2 x", x: 500, y: 760 },
      { text: "Next product", x: 120, y: 640 }, { text: "MPN: NEXT-2", x: 120, y: 620 },
      { text: "EAN: 9589046921490", x: 120, y: 600 }, { text: "1 x", x: 500, y: 620 },
    ], photos: [{ y: 595, color: [255, 255, 0] }] },
  ]));
  assert.equal(products.length, 2);
  assert.equal(products[0].mpn, "BAND-1");
  assert.equal(products[0].ean, "5949419373785");
  assert.equal(products[0].quantity, 2);
  assert.deepEqual(firstPixel(products[0].image), [0, 255, 0]);
  assert.deepEqual(firstPixel(products[1].image), [255, 255, 0]);
});

test("incomplete rows produce an error instead of silently dropping or shifting products", () => {
  assert.throws(() => parseProductsFromTextLines([
    "Broken product", "MPN: BROKEN", "1 ×",
    "Next product", "MPN: NEXT", "EAN: 5907769300684", "1 ×",
  ]), PdfOrderParseError);
});

test("a title split between pages keeps the photo from the previous page", async () => {
  const [product] = await parseOrderPdf(fixture([
    { text: [{ text: "Huawei Watch Fit", x: 120, y: 50 }], photos: [{ y: 20, color: [255, 0, 255] }] },
    { text: [
      { text: "5 Pro - Plum", x: 120, y: 740 }, { text: "1 x", x: 500, y: 740 },
      { text: "MPN: KF-", x: 120, y: 720 }, { text: "5949419373785", x: 120, y: 700 },
      { text: "EAN: 5949419373785", x: 120, y: 680 },
    ], photos: [] },
  ]));
  assert.equal(product.title, "Huawei Watch Fit 5 Pro - Plum");
  assert.equal(product.mpn, "KF-5949419373785");
  assert.deepEqual(firstPixel(product.image), [255, 0, 255]);
});
