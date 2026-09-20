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
  getTextContent: () => Promise<{ items: unknown[] }>;
  getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[][] }>;
  objs: { get: (id: string, callback: (data: PdfImageData) => void) => null };
};

type PdfImageData = {
  width: number;
  height: number;
  kind: number;
  data: Uint8Array | Uint8ClampedArray;
};

const CATEGORY_HINTS = [
  "Θήκες",
  "Προστατευτικά",
  "Φορτιστές",
  "Καλώδια",
  "Ακουστικά",
  "Αξεσουάρ",
  "Βάσεις",
  "Μπαταρίες",
  "Πληκτρολόγια",
  "Ποντίκια",
];

const fieldPattern = /^(MPN|EAN)\s*:\s*(.*)$/i;
const quantityPattern = /^(\d+)\s*[×x*]?(?:\s*)$/;
const eanPattern = /^\d{8,14}$/;

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isMostlyUppercase(value: string): boolean {
  const letters = value.match(/[A-Za-zΑ-Ωα-ω]/g) ?? [];
  const uppercase = value.match(/[A-ZΑ-Ω]/g) ?? [];
  return letters.length > 3 && uppercase.length / letters.length > 0.8;
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

function isLikelyCategory(text: string): boolean {
  const normalized = cleanText(text);
  if (!normalized || normalized.length < 4 || normalized.length > 100) return false;
  if (/^(Προϊόν|Ποσότητα|MPN|EAN|Σελίδα|Page)\b/i.test(normalized)) return false;
  if (fieldPattern.test(normalized) || quantityPattern.test(normalized) || eanPattern.test(normalized)) return false;
  return CATEGORY_HINTS.some((hint) => normalized.includes(hint)) || isMostlyUppercase(normalized);
}

function isTitleCandidate(text: string): boolean {
  const normalized = cleanText(text);
  if (!normalized || normalized.length < 5) return false;
  if (fieldPattern.test(normalized) || quantityPattern.test(normalized) || eanPattern.test(normalized)) return false;
  if (/^(Προϊόν|Ποσότητα|MPN|EAN|Σελίδα|Page)\b/i.test(normalized)) return false;
  return true;
}

function looksLikeMpn(value: string): boolean {
  const normalized = normalizeFieldValue(value);
  return normalized.length > 2 && !eanPattern.test(normalized);
}

function parseProductsFromLines(lines: TextLine[]): Product[] {
  const products: Product[] = [];
  let category = "Λοιπά";
  let current: Partial<Product> & { titleLines?: string[] } | null = null;
  let productIndex = 0;

  const flush = () => {
    if (!current?.title || !current.ean || !current.mpn || !current.quantity) return;
    const title = cleanText(current.title);
    const ean = extractEan(current.ean) ?? "";
    const mpn = normalizeFieldValue(current.mpn);
    const quantity = Number(current.quantity);
    if (!title || !ean || !looksLikeMpn(mpn) || !Number.isFinite(quantity) || quantity < 1) {
      return;
    }

    products.push({
      id: `${ean}-${productIndex}`,
      category: current.category ?? category,
      title,
      mpn,
      ean,
      quantity,
      pickedQuantity: 0,
      originalIndex: productIndex,
    });
    productIndex += 1;
    current = null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const text = cleanText(line.text);
    if (!text) continue;

    if (isHeaderLine(text)) continue;

    const nextLine = cleanText(lines[index + 1]?.text ?? "");
    if ((isLikelyCategory(text) || isHeaderLine(nextLine)) && !current?.title) {
      flush();
      category = text;
      continue;
    }

    const mpn = extractField(text, "MPN");
    const ean = extractField(text, "EAN");
    const quantity = extractQuantity(text);
    if (mpn || ean || quantity !== null) {
      if (!current) current = { category, titleLines: [] };
      if (mpn) current.mpn = mpn;
      if (ean) current.ean = ean;
      if (quantity !== null) current.quantity = quantity;
      flush();
      continue;
    }

    if (current?.mpn && !current.ean) {
      const eanOnly = extractEan(text);
      if (eanOnly) {
        current.ean = eanOnly;
        flush();
        continue;
      }
    }

    if (!current) current = { category, titleLines: [] };
    if (current.title && (current.mpn || current.ean || current.quantity)) {
      flush();
      current = { category, titleLines: [] };
    }
    if (isTitleCandidate(text)) {
      current.titleLines = [...(current.titleLines ?? []), text];
      current.title = current.titleLines.join(" ");
    }
  }

  flush();
  return products;
}

async function extractPage(page: PdfPageLike, pdfjsLib: PdfJsApi) {
  const content = await page.getTextContent();
  const tokens: PositionedToken[] = [];

  for (const item of content.items) {
    if (typeof item !== "object" || item === null || !("str" in item)) continue;
    const textItem = item as Partial<TextItem>;
    if (typeof textItem.str !== "string" || !textItem.str.trim() || !textItem.transform || typeof textItem.width !== "number" || typeof textItem.height !== "number") continue;
    tokens.push({
      text: textItem.str,
      x: textItem.transform[4],
      y: textItem.transform[5],
      width: textItem.width,
      height: textItem.height,
    });
  }

  const images: PdfImageCandidate[] = [];
  try {
    const operatorList = await page.getOperatorList();
    let imageIndex = 0;
    for (let index = 0; index < operatorList.fnArray.length; index += 1) {
      const fn = operatorList.fnArray[index];
      const args = operatorList.argsArray[index] as unknown[];
      if (fn !== pdfjsLib.OPS.paintImageXObject && fn !== pdfjsLib.OPS.paintInlineImageXObject) continue;
      const name = typeof args?.[0] === "string" ? args[0] : `image-${index}`;
      const width = typeof args?.[1] === "number" ? args[1] : 0;
      const height = typeof args?.[2] === "number" ? args[2] : 0;
      // Skroutz exports each product row as a larger product image followed by a smaller barcode image.
      if (imageIndex % 2 === 0) {
        const data = await new Promise<PdfImageData | undefined>((resolve) => {
          try { page.objs.get(name, (image) => resolve(image)); } catch { resolve(undefined); }
        });
        images.push({ name, x: 0, y: 0, width, height, data: data ? encodePdfImage(data) : undefined });
      }
      imageIndex += 1;
    }
  } catch {
    // Image extraction is best effort. Text parsing should never fail because images are unavailable.
  }

  return { lines: groupLines(tokens), images };
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

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const extracted = await extractPage(page, pdfjsLib);
    allLines.push(...extracted.lines);
    allImages.push(...extracted.images);
  }

  // The rows are parsed from PDF text, while the product images are decoded from the PDF image
  // operators directly. This keeps the route independent from a native Node canvas renderer.
  const products = parseProductsFromLines(allLines);
  return products.map((product, index) => ({ ...product, image: allImages[index]?.data }));
}

export function parseProductsFromTextLines(lines: string[]): Product[] {
  const positioned = lines.map((text, index) => ({
    text,
    x: 0,
    y: lines.length - index,
    width: text.length,
    height: 10,
  }));
  return parseProductsFromLines(groupLines(positioned));
}
