import { NextResponse } from "next/server";
import { parseOrderPdf } from "@/lib/pdf/parseOrderPdf";

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
    const products = await parseOrderPdf(buffer);
    if (products.length === 0) {
      return NextResponse.json(
        { error: "Δεν βρέθηκαν προϊόντα στο PDF. Έλεγξε ότι περιέχει το αναμενόμενο text layer." },
        { status: 422 },
      );
    }

    return NextResponse.json({ products, sourceName: file.name });
  } catch (error) {
    console.error("PDF parsing failed", error);
    return NextResponse.json({ error: "Δεν ήταν δυνατή η επεξεργασία του PDF." }, { status: 500 });
  }
}
