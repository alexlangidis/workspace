import { NextResponse } from "next/server";
import { parseOrderPdf, PdfOrderParseError } from "@/lib/pdf/parseOrderPdf";
import type { ParseWarning } from "@/types/product";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"))) {
      return NextResponse.json({ error: "Επίλεξε ένα αρχείο PDF." }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "Το PDF πρέπει να είναι μικρότερο από 20 MB." }, { status: 413 });
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const warnings: ParseWarning[] = [];
    const products = await parseOrderPdf(buffer, warnings);
    if (products.length === 0) {
      return NextResponse.json(
        { error: warnings.length ? "Δεν διαβάστηκε πλήρως κανένα προϊόν. Έλεγξε το PDF ή εξήγαγέ το ξανά από το Skroutz." : "Δεν βρέθηκαν προϊόντα στο PDF. Έλεγξε ότι περιέχει το αναμενόμενο text layer.", warnings },
        { status: 422 },
      );
    }

    return NextResponse.json({ products, warnings, sourceName: file.name });
  } catch (error) {
    if (error instanceof PdfOrderParseError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error("PDF parsing failed", error);
    return NextResponse.json({ error: "Δεν ήταν δυνατή η επεξεργασία του PDF." }, { status: 500 });
  }
}
