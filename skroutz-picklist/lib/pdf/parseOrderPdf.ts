import { deflateSync } from "node:zlib";
import type { Product } from "@/types/product";

type PdfJsApi = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let pdfjsPromise: Promise<PdfJsApi> | undefined;

type MatrixInit = number[] | {
  a?: number;
  b?: number;
  c?: number;
  d?: number;
  e?: number;
  f?: number;
};

class PdfDomMatrixPolyfill {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;
  is2D = true;

  constructor(init?: MatrixInit) {
    if (Array.isArray(init) && init.length >= 6) {
      [this.a, this.b, this.c, this.d, this.e, this.f] = init;
    } else if (init) {
      Object.assign(this, init);
    }
  }

  get m11() { return this.a; }
  get m12() { return this.b; }
  get m21() { return this.c; }
  get m22() { return this.d; }
  get m41() { return this.e; }
  get m42() { return this.f; }
  get isIdentity() { return this.a === 1 && this.b === 0 && this.c === 0 && this.d === 1 && this.e === 0 && this.f === 0; }

  translate(tx = 0, ty = 0) {
    return new PdfDomMatrixPolyfill([this.a, this.b, this.c, this.d, this.e + tx, this.f + ty]);
  }

  translateSelf(tx = 0, ty = 0) {
    this.e += tx;
    this.f += ty;
    return this;
  }

  scale(scaleX = 1, scaleY = scaleX) {
    return new PdfDomMatrixPolyfill([this.a * scaleX, this.b * scaleX, this.c * scaleY, this.d * scaleY, this.e, this.f]);
  }

  scaleSelf(scaleX = 1, scaleY = scaleX) {
    this.a *= scaleX;
    this.b *= scaleX;
    this.c *= scaleY;
    this.d *= scaleY;
    return this;
  }

  multiply() {
    return new PdfDomMatrixPolyfill([this.a, this.b, this.c, this.d, this.e, this.f]);
  }

  multiplySelf() {
    return this;
  }

  preMultiplySelf() {
    return this;
  }

  invertSelf() {
    const determinant = this.a * this.d - this.b * this.c;
    if (determinant === 0) return this;
    const { a, b, c, d, e, f } = this;
    this.a = d / determinant;
    this.b = -b / determinant;
    this.c = -c / determinant;
    this.d = a / determinant;
    this.e = (c * f - d * e) / determinant;
    this.f = (b * e - a * f) / determinant;
    return this;
  }

  inverse() {
    return new PdfDomMatrixPolyfill([this.a, this.b, this.c, this.d, this.e, this.f]).invertSelf();
  }

  toFloat32Array() {
    return new Float32Array([this.a, this.b, this.c, this.d, this.e, this.f]);
  }

  toFloat64Array() {
    return new Float64Array([this.a, this.b, this.c, this.d, this.e, this.f]);
  }
}

class PdfImageDataPolyfill {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
    if (typeof dataOrWidth === "number") {
      this.width = dataOrWidth;
      this.height = widthOrHeight;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      this.data = dataOrWidth;
      this.width = widthOrHeight;
      this.height = height ?? 0;
    }
  }
}

class PdfPath2DPolyfill {
  constructor(path?: unknown) {
    void path;
  }
}

function installPdfjsNodePolyfills() {
  const runtime = globalThis as unknown as {
    DOMMatrix?: unknown;
    ImageData?: unknown;
    Path2D?: unknown;
  };
  runtime.DOMMatrix ??= PdfDomMatrixPolyfill;
  runtime.ImageData ??= PdfImageDataPolyfill;
  runtime.Path2D ??= PdfPath2DPolyfill;
}

async function loadPdfjs(): Promise<PdfJsApi> {
  if (!pdfjsPromise) {
    installPdfjsNodePolyfills();
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return pdfjsPromise;
}

type TextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
};

type PositionedToken = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type TextLine = {
  y: number;
  tokens: PositionedToken[];
  text: string;
  minX: number;
  maxX: number;
  productColumnX?: number;
  quantityColumnX?: number;
};

type PdfImageCandidate = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  data?: string;
};

type PdfPageLike = {
  view: number[];
  getTextContent: () => Promise<{ items: unknown[] }>;
  getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[][] }>;
  objs: { get: (id: string, callback: (data: PdfImageData) => void) => null };
  commonObjs: { get: (id: string, callback: (data: PdfImageData) => void) => null };
};

type PdfImageData = {
  width: number;
  height: number;
  kind: number;
  data: Uint8Array | Uint8ClampedArray;
};

const quantityPattern = /^(\d+)\s*[×x*]?(?:\s*)$/;
const eanPattern = /^\d{8,14}$/;

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function groupLines(tokens: PositionedToken[]): TextLine[] {
  const sorted = [...tokens].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: TextLine[] = [];

  for (const token of sorted) {
    if (!token.text) continue;
    const line = lines.find((candidate) => Math.abs(candidate.y - token.y) <= 2.5);
    if (line) {
      line.tokens.push(token);
      line.minX = Math.min(line.minX, token.x);
      line.maxX = Math.max(line.maxX, token.x + token.width);
      line.text = line.tokens
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(" ");
    } else {
      lines.push({
        y: token.y,
        tokens: [token],
        text: token.text,
        minX: token.x,
        maxX: token.x + token.width,
      });
    }
  }

  return lines.sort((a, b) => b.y - a.y);
}

function normalizeFieldValue(value: string): string {
  return cleanText(value).replace(/[|·]/g, "");
}

function extractQuantity(text: string): number | null {
  const match = text.match(/(?:^|\s)(\d+)\s*[×x*](?=\s|$)/);
  return match ? Number(match[1]) : null;
}

function extractEan(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  return eanPattern.test(digits) ? digits : null;
}

function extractField(text: string, fieldName: "MPN" | "EAN"): string | null {
  const match = text.match(new RegExp(`\\b${fieldName}\\s*:\\s*(.*?)(?=\\s+\\d+\\s*[×x*](?:\\s|$)|\\s+(?:MPN|EAN)\\s*:|$)`, "i"));
  return match?.[1] ? normalizeFieldValue(match[1]) : null;
}

function isHeaderLine(text: string): boolean {
  return /^(Προϊόν\s+Ποσότητα|Προϊόν|Ποσότητα)$/i.test(cleanText(text));
}

function crc32(value: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of value) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBytes, Buffer.from(data)]);
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  body.copy(chunk, 4);
  chunk.writeUInt32BE(crc32(body), 8 + data.length);
  return chunk;
}

function encodePdfImage(image: PdfImageData): string | undefined {
  const { width, height, kind, data } = image;
  if (!width || !height || !data?.length) return undefined;
  const source = Buffer.from(data);
  const channels = kind === 3 ? 4 : kind === 2 ? 3 : 1;
  const rowSize = width * 3;
  const raw = Buffer.alloc((rowSize + 1) * height);
  for (let row = 0; row < height; row += 1) {
    const rawOffset = row * (rowSize + 1);
    raw[rawOffset] = 0;
    for (let column = 0; column < width; column += 1) {
      const sourceOffset = (row * width + column) * channels;
      const targetOffset = rawOffset + 1 + column * 3;
      if (channels === 1) {
        raw[targetOffset] = source[sourceOffset];
        raw[targetOffset + 1] = source[sourceOffset];
        raw[targetOffset + 2] = source[sourceOffset];
      } else {
        raw[targetOffset] = source[sourceOffset];
        raw[targetOffset + 1] = source[sourceOffset + 1];
        raw[targetOffset + 2] = source[sourceOffset + 2];
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", new Uint8Array()),
  ]);
  return `data:image/png;base64,${png.toString("base64")}`;
}

function looksLikeMpn(value: string): boolean {
  const normalized = normalizeFieldValue(value);
  return normalized.length > 0;
}

export class PdfOrderParseError extends Error {}

function parseProductsFromLines(lines: TextLine[], images: PdfImageCandidate[] = []): Product[] {
  const products: Product[] = [];
  let category = "Λοιπά";
  let current: (Partial<Product> & { topY: number; bottomY: number; titleX: number }) | null = null;
  let lastField: "MPN" | "EAN" | undefined;
  const usedImages = new Set<PdfImageCandidate>();

  const flush = () => {
    if (!current) return;
    const title = cleanText(current.title ?? "");
    const ean = extractEan(current.ean ?? "") ?? "";
    const mpn = normalizeFieldValue(current.mpn ?? "");
    const quantity = Number(current.quantity);
    if (!title || !ean || !looksLikeMpn(mpn) || !Number.isFinite(quantity) || quantity < 1) {
      throw new PdfOrderParseError(`Δεν διαβάστηκε πλήρως το προϊόν «${title || mpn || ean || "χωρίς τίτλο"}». Έλεγξε αν ο τίτλος, το MPN, το EAN ή η ποσότητα έχουν κοπεί στο PDF.`);
    }

    const row = current;
    // Match by location, never by array index: one missing row/image must not shift the rest.
    const image = images
      .filter((candidate) => candidate.data && !usedImages.has(candidate) && candidate.x + candidate.width / 2 < row.titleX)
      .map((candidate) => ({ candidate, overlap: Math.min(candidate.y + candidate.height, row.topY) - Math.max(candidate.y, row.bottomY) }))
      .filter(({ overlap }) => overlap > 0)
      .sort((a, b) => b.overlap - a.overlap)[0]?.candidate;
    if (image) usedImages.add(image);
    const productIndex = products.length;
    products.push({
      id: `${ean}-${productIndex}`,
      category: current.category ?? category,
      title,
      mpn,
      ean,
      quantity,
      pickedQuantity: 0,
      originalIndex: productIndex,
      image: image?.data,
    });
    current = null;
    lastField = undefined;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (isHeaderLine(line.text) || /^(?:Σελίδα|Page)\s+\d|^\d+\s*\/\s*\d+$/i.test(cleanText(line.text))) continue;
    const quantityTokens = line.quantityColumnX === undefined ? [] : line.tokens.filter((token) => token.x >= line.quantityColumnX! - 5);
    const textTokens = line.tokens.filter((token) => !quantityTokens.includes(token));
    const text = cleanText(textTokens.map((token) => token.text).join(" "));
    let categoryEnd = index;
    while (categoryEnd + 1 < lines.length && categoryEnd - index < 3 && !isHeaderLine(lines[categoryEnd + 1].text) && line.productColumnX !== undefined && lines[categoryEnd + 1].minX < line.productColumnX - 10) categoryEnd += 1;
    if (text && isHeaderLine(lines[categoryEnd + 1]?.text ?? "") && (line.productColumnX === undefined || line.minX < line.productColumnX - 10)) {
      // A repeated table header can occur in the middle of a row at a page break.
      if (current?.title && current.mpn && extractEan(current.ean ?? "") && current.quantity) flush();
      category = cleanText(lines.slice(index, categoryEnd + 1).map((item) => item.text).join(" "));
      index = categoryEnd;
      continue;
    }

    const quantityText = cleanText(quantityTokens.map((token) => token.text).join(" "));
    const quantityMatch = quantityText.match(quantityPattern);
    const quantity = line.quantityColumnX === undefined
      ? extractQuantity(text)
      : extractQuantity(quantityText) ?? (quantityMatch ? Number(quantityMatch[1]) : null);
    const hasMpn = /\bMPN\s*:/i.test(text);
    const hasEan = /\bEAN\s*:/i.test(text);
    const mpn = extractField(text, "MPN");
    const ean = extractField(text, "EAN");
    const isFieldContinuation = Boolean(current && lastField && text && !hasMpn && !hasEan && (lastField === "MPN" ? !current.mpn || /^[A-Za-z0-9._/#-]+$/.test(text) : /^[\d\s]+$/.test(text)));
    const isTitle = text && !hasMpn && !hasEan && !isFieldContinuation && !quantityPattern.test(text);

    if (isTitle && (current?.mpn !== undefined || current?.ean !== undefined)) flush();
    if (!current) {
      if (!text && quantity === null) continue;
      current = { category, topY: line.y, bottomY: line.y, titleX: textTokens[0]?.x ?? line.productColumnX ?? 0 };
    }
    current.topY = Math.max(current.topY, ...line.tokens.map((token) => token.y + token.height));
    current.bottomY = Math.min(current.bottomY, line.y);

    if (hasMpn) {
      if (current.mpn !== undefined) throw new PdfOrderParseError("Βρέθηκε δεύτερο MPN στην ίδια γραμμή προϊόντος. Έλεγξε τη διάταξη του PDF.");
      current.mpn = mpn ?? "";
      lastField = "MPN";
    }
    if (hasEan) {
      if (current.ean !== undefined) throw new PdfOrderParseError("Βρέθηκε δεύτερο EAN στην ίδια γραμμή προϊόντος. Έλεγξε τη διάταξη του PDF.");
      current.ean = ean ?? "";
      lastField = "EAN";
    }
    if (isFieldContinuation) {
      if (lastField === "MPN") current.mpn = normalizeFieldValue(`${current.mpn ?? ""}${text}`);
      else current.ean = `${current.ean ?? ""}${text}`;
    }
    if (isTitle) {
      if (!current.title) current.titleX = textTokens[0]?.x ?? current.titleX;
      current.title = cleanText(`${current.title ?? ""} ${text}`);
    }
    if (quantity !== null) {
      if (current.quantity !== undefined && current.quantity !== quantity) {
        throw new PdfOrderParseError("Βρέθηκαν διαφορετικές ποσότητες για το ίδιο προϊόν. Έλεγξε τη διάταξη του PDF.");
      }
      current.quantity = quantity;
    }
  }

  flush();
  return products;
}

function multiplyMatrices(left: number[], right: number[]): number[] {
  return [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4],
    left[1] * right[4] + left[3] * right[5] + left[5],
  ];
}

async function extractPage(page: PdfPageLike, pdfjsLib: PdfJsApi, pageOffset: number) {
  const content = await page.getTextContent();
  const tokens: PositionedToken[] = [];

  for (const item of content.items) {
    if (typeof item !== "object" || item === null || !("str" in item)) continue;
    const textItem = item as Partial<TextItem>;
    if (typeof textItem.str !== "string" || !textItem.str.trim() || !textItem.transform || typeof textItem.width !== "number" || typeof textItem.height !== "number") continue;
    tokens.push({
      text: textItem.str,
      x: textItem.transform[4],
      y: textItem.transform[5] - pageOffset,
      width: textItem.width,
      height: textItem.height,
    });
  }

  const productColumnX = tokens.find((token) => /^MPN\s*:/i.test(cleanText(token.text)))?.x
    ?? tokens.find((token) => /^EAN\s*:/i.test(cleanText(token.text)))?.x
    ?? tokens.find((token) => cleanText(token.text) === "Προϊόν")?.x;
  const quantityColumnX = tokens.find((token) => cleanText(token.text) === "Ποσότητα")?.x
    ?? tokens.find((token) => quantityPattern.test(cleanText(token.text)) && token.x > page.view[2] * 0.6)?.x;
  const images: PdfImageCandidate[] = [];
  try {
    const operatorList = await page.getOperatorList();
    let matrix = [1, 0, 0, 1, 0, 0];
    const stack: number[][] = [];
    for (let index = 0; index < operatorList.fnArray.length; index += 1) {
      const fn = operatorList.fnArray[index];
      const args = operatorList.argsArray[index] as unknown[];
      if (fn === pdfjsLib.OPS.save) { stack.push([...matrix]); continue; }
      if (fn === pdfjsLib.OPS.restore) { matrix = stack.pop() ?? [1, 0, 0, 1, 0, 0]; continue; }
      if (fn === pdfjsLib.OPS.transform) { matrix = multiplyMatrices(matrix, args as number[]); continue; }
      if (fn !== pdfjsLib.OPS.paintImageXObject && fn !== pdfjsLib.OPS.paintInlineImageXObject) continue;
      const name = typeof args?.[0] === "string" ? args[0] : `image-${index}`;
      const corners = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]]);
      const x = Math.max(page.view[0], Math.min(...corners.map((point) => point[0])));
      const right = Math.min(page.view[2], Math.max(...corners.map((point) => point[0])));
      const bottom = Math.max(page.view[1], Math.min(...corners.map((point) => point[1])));
      const top = Math.min(page.view[3], Math.max(...corners.map((point) => point[1])));
      // Product photos are in the left image column; barcodes are in the text column.
      if (right <= x || top <= bottom || (productColumnX !== undefined && (x + right) / 2 >= productColumnX)) continue;
      const data = fn === pdfjsLib.OPS.paintInlineImageXObject
        ? args[0] as PdfImageData
        : await new Promise<PdfImageData | undefined>((resolve) => {
          try { (name.startsWith("g_") ? page.commonObjs : page.objs).get(name, (image) => resolve(image)); } catch { resolve(undefined); }
        });
      images.push({ name, x, y: bottom - pageOffset, width: right - x, height: top - bottom, data: data ? encodePdfImage(data) : undefined });
    }
  } catch {
    // Image extraction is best effort. Text parsing should never fail because images are unavailable.
  }

  let currentProductColumnX = productColumnX;
  let currentQuantityColumnX = quantityColumnX;
  return { lines: groupLines(tokens).map((line) => {
    if (isHeaderLine(line.text)) {
      currentProductColumnX = line.tokens.find((token) => cleanText(token.text) === "Προϊόν")?.x ?? currentProductColumnX;
      currentQuantityColumnX = line.tokens.find((token) => cleanText(token.text) === "Ποσότητα")?.x ?? currentQuantityColumnX;
    }
    return { ...line, productColumnX: currentProductColumnX, quantityColumnX: currentQuantityColumnX };
  }), images };
}

async function getPdfDocument(data: Uint8Array, pdfjsLib: PdfJsApi) {
  // PDF.js v5 uses its fake worker in Node. Point it at the installed local worker so
  // Next's bundled route handler can load it without a browser-served worker asset.
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    const workerPath = await import.meta.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
  }
  const loadingTask = pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
  });
  return loadingTask.promise;
}

export async function parseOrderPdf(data: Uint8Array): Promise<Product[]> {
  const pdfjsLib = await loadPdfjs();
  const pdf = await getPdfDocument(data, pdfjsLib);
  const allLines: TextLine[] = [];
  const allImages: PdfImageCandidate[] = [];
  let pageOffset = 0;
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const extracted = await extractPage(page, pdfjsLib, pageOffset);
      allLines.push(...extracted.lines);
      allImages.push(...extracted.images);
      pageOffset += page.view[3] - page.view[1];
    }
    return parseProductsFromLines(allLines, allImages);
  } finally {
    await pdf.destroy();
  }
}

export function parseProductsFromTextLines(lines: string[]): Product[] {
  const positioned = lines.map((text, index) => ({
    text,
    x: 0,
    y: (lines.length - index) * 20,
    width: text.length,
    height: 10,
  }));
  return parseProductsFromLines(groupLines(positioned));
}
