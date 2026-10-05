import assert from "node:assert/strict";
import { test } from "node:test";
import { inflateSync } from "node:zlib";
import { parseOrderPdf, parseProductsFromTextLines, PdfOrderParseError } from "../lib/pdf/parseOrderPdf";

type Text = { text: string; x: number; y: number };
type Photo = { x?: number; y: number; color: [number, number, number] };

// Minimal PDFs exercise the real PDF.js text/image operators, including page breaks.
function fixture(pages: Array<{ text: Text[]; photos: Photo[] }>): Uint8Array {
  const objects: Buffer[] = [];
  const add = (value: string | Buffer) => { objects.push(Buffer.from(value)); return objects.length; };
  const stream = (dictionary: string, data: Buffer) => Buffer.concat([Buffer.from(`<< ${dictionary} /Length ${data.length} >>\nstream\n`), data, Buffer.from("\nendstream")]);
  add("");
  add("");
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const unicodeText = [...new Set(pages.flatMap(page => page.text.map(item => item.text)).filter(text => /[^\x00-\x7f]/.test(text)))];
  const mappings = unicodeText.map((text, i) => `<${(65 + i).toString(16)}> <${Array.from(text).map(character => character.charCodeAt(0).toString(16).padStart(4, "0")).join("")}>`).join("\n");
  const cmap = add(stream("", Buffer.from(`/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /FixtureUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<00> <FF>\nendcodespacerange\n${unicodeText.length} beginbfchar\n${mappings}\nendbfchar\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend`)));
  const unicodeFont = add(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /ToUnicode ${cmap} 0 R >>`);
  const pageIds: number[] = [];
  for (const page of pages) {
    const images = page.photos.map((photo) => add(stream("/Type /XObject /Subtype /Image /Width 6 /Height 6 /ColorSpace /DeviceRGB /BitsPerComponent 8", Buffer.from(Array.from({ length: 36 }, () => photo.color).flat()))));
    const content = [
      ...page.text.map(({ text, x, y }) => {
        const unicodeIndex = unicodeText.indexOf(text);
        const encoded = unicodeIndex >= 0 ? String.fromCharCode(65 + unicodeIndex) : text.replace(/[\\()]/g, "\\$&");
        return `BT /${unicodeIndex >= 0 ? "F2" : "F1"} 11 Tf 1 0 0 1 ${x} ${y} Tm (${encoded}) Tj ET`;
      }),
      ...page.photos.map((photo, i) => `q 60 0 0 60 ${photo.x ?? 40} ${photo.y} cm /Photo${i} Do Q`),
    ].join("\n");
    const contents = add(stream("", Buffer.from(content)));
    pageIds.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R /F2 ${unicodeFont} 0 R >> /XObject << ${images.map((id, i) => `/Photo${i} ${id} 0 R`).join(" ")} >> >> /Contents ${contents} 0 R >>`));
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

test("EAN-only page continuation is not swallowed by a later wider table category", async () => {
  const products = await parseOrderPdf(fixture([
    { text: [
      { text: "Bicycle covers", x: 40, y: 180 },
      { text: "Προϊόν", x: 120, y: 150 }, { text: "Ποσότητα", x: 500, y: 150 },
      { text: "Wozinsky WPP-010 cover", x: 120, y: 100 },
      { text: "MPN: HL-5907769384813", x: 120, y: 80 }, { text: "1 x", x: 500, y: 60 },
    ], photos: [{ y: 50, color: [255, 0, 0] }] },
    { text: [
      { text: "EAN: 590776938", x: 120, y: 790 }, { text: "4813", x: 185, y: 790 },
      { text: "Touch pens", x: 40, y: 690 },
      { text: "Προϊόν", x: 210, y: 660 }, { text: "Ποσότητα", x: 460, y: 660 },
      { text: "Stylus Pen Black", x: 210, y: 620 }, { text: "MPN: THP042BLK", x: 210, y: 600 },
      { text: "EAN: 5906735410952", x: 210, y: 580 }, { text: "2 x", x: 460, y: 600 },
    ], photos: [{ x: 140, y: 575, color: [0, 255, 0] }] },
  ]));
  assert.equal(products.length, 2);
  assert.equal(products[0].category, "Bicycle covers");
  assert.equal(products[0].title, "Wozinsky WPP-010 cover");
  assert.equal(products[0].mpn, "HL-5907769384813");
  assert.equal(products[0].ean, "5907769384813");
  assert.equal(products[0].quantity, 1);
  assert.equal(products[1].category, "Touch pens");
  assert.equal(products[1].quantity, 2);
  assert.deepEqual(firstPixel(products[0].image), [255, 0, 0]);
  assert.deepEqual(firstPixel(products[1].image), [0, 255, 0]);
});

test("a table header on the previous page is not replaced by a later table's columns", async () => {
  const products = await parseOrderPdf(fixture([
    { text: [
      { text: "Προϊόν", x: 120, y: 780 }, { text: "Ποσότητα", x: 500, y: 780 },
      { text: "Tablet case", x: 120, y: 740 }, { text: "MPN: TABLET", x: 120, y: 720 },
      { text: "EAN: 9319456607406", x: 120, y: 700 }, { text: "1 x", x: 500, y: 720 },
      { text: "Tracker accessories", x: 40, y: 140 },
      { text: "Προϊόν", x: 160, y: 110 }, { text: "Ποσότητα", x: 460, y: 110 },
    ], photos: [{ y: 695, color: [255, 0, 0] }] },
    { text: [
      { text: "Airtag Clear", x: 160, y: 760 }, { text: "MPN: AIRTAG", x: 160, y: 740 },
      { text: "EAN: 5906302360765", x: 160, y: 720 }, { text: "1 x", x: 460, y: 745 },
      { text: "Other products", x: 40, y: 670 },
      { text: "Προϊόν", x: 130, y: 640 }, { text: "Ποσότητα", x: 510, y: 640 },
      { text: "Fitness ball", x: 130, y: 600 }, { text: "MPN: BALL", x: 130, y: 580 },
      { text: "EAN: 5907769300684", x: 130, y: 560 }, { text: "2 x", x: 510, y: 580 },
    ], photos: [{ y: 710, color: [0, 255, 0] }, { y: 555, color: [0, 0, 255] }] },
  ]));
  assert.equal(products.length, 3);
  assert.equal(products[1].title, "Airtag Clear");
  assert.equal(products[1].category, "Tracker accessories");
  assert.equal(products[1].quantity, 1);
  assert.equal(products[2].category, "Other products");
  assert.equal(products[2].quantity, 2);
  assert.deepEqual(firstPixel(products[1].image), [0, 255, 0]);
  assert.deepEqual(firstPixel(products[2].image), [0, 0, 255]);
});
