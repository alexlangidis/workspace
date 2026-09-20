"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { FileUp, LoaderCircle, ScanLine, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { writeStoredOrder } from "@/lib/storage";
import type { Product } from "@/types/product";

type ParseResponse = { products?: Product[]; sourceName?: string; error?: string };

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  async function processFile(file?: File) {
    if (!file) return;
    setError("");
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Επίλεξε ένα αρχείο PDF για να συνεχίσεις.");
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/parse-pdf", { method: "POST", body: formData });
      const responseText = await response.text();
      let result: ParseResponse = {};
      try {
        result = responseText ? (JSON.parse(responseText) as ParseResponse) : {};
      } catch {
        throw new Error(`Ο server δεν επέστρεψε έγκυρη απάντηση (${response.status}). Έλεγξε τα Vercel Function Logs.`);
      }
      if (!response.ok || !result.products?.length) {
        throw new Error(result.error || "Δεν βρέθηκαν προϊόντα στο PDF.");
      }

      writeStoredOrder({
        products: result.products,
        sourceName: result.sourceName || file.name,
        parsedAt: new Date().toISOString(),
      });
      router.push("/checklist");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Η επεξεργασία απέτυχε.");
      setIsProcessing(false);
    }
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    void processFile(event.target.files?.[0]);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    void processFile(event.dataTransfer.files?.[0]);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-ink text-paper">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-5 py-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between">
          <Logo />
          <div className="hidden items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted sm:flex">
            <span className="size-2 rounded-full bg-lime" />
            local-first tool
          </div>
        </header>

        <section className="grid flex-1 items-center gap-14 py-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,0.8fr)] lg:gap-24 lg:py-20">
          <div className="animate-fade-up max-w-2xl">
            <p className="mb-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.25em] text-lime">
              <span className="h-px w-9 bg-lime/60" />
              Από PDF σε ράφι
            </p>
            <h1 className="font-display max-w-xl text-[clamp(3.2rem,8vw,7rem)] font-semibold leading-[0.88] tracking-[-0.075em] text-paper">
              Μάζεψε την παραγγελία <span className="text-lime">σωστά.</span>
            </h1>
            <p className="mt-8 max-w-md text-base leading-7 text-muted sm:text-lg">
              Ανέβασε τη λίστα αποστολής από το Skroutz και δούλεψε με μια καθαρή checklist που θυμάται κάθε scan.
            </p>
            <div className="mt-10 flex flex-wrap gap-6 text-[12px] font-semibold text-paper/70">
              <span className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-lime" /> Χωρίς cloud</span>
              <span className="inline-flex items-center gap-2"><ScanLine size={16} className="text-lime" /> Scanner-ready</span>
            </div>
          </div>

          <div className="animate-fade-up-delayed">
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
              }}
              onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={`group relative min-h-[390px] cursor-pointer overflow-hidden rounded-[30px] border p-6 transition duration-300 sm:p-8 ${isDragging ? "border-lime bg-lime/10" : "border-paper/15 bg-paper/[0.06] hover:border-lime/60 hover:bg-paper/[0.09]"}`}
            >
              <div className="absolute -right-16 -top-16 size-48 rounded-full border border-lime/10 transition duration-500 group-hover:scale-125" />
              <div className="absolute -bottom-24 -left-16 size-64 rounded-full border border-paper/10" />
              <div className="relative flex min-h-[340px] flex-col items-center justify-center text-center">
                {isProcessing ? (
                  <>
                    <LoaderCircle size={42} className="animate-spin text-lime" />
                    <p className="mt-7 font-display text-2xl font-semibold tracking-[-0.04em]">Γίνεται επεξεργασία PDF...</p>
                    <p className="mt-3 max-w-xs text-sm leading-6 text-muted">Διαβάζουμε προϊόντα, ποσότητες και EAN από το αρχείο σου.</p>
                  </>
                ) : (
                  <>
                    <div className="grid size-20 place-items-center rounded-[24px] bg-lime text-ink transition duration-300 group-hover:-translate-y-1 group-hover:rotate-3">
                      <FileUp size={31} strokeWidth={1.8} />
                    </div>
                    <p className="mt-7 font-display text-2xl font-semibold tracking-[-0.04em]">Ανέβασε λίστα παραγγελίας</p>
                    <p className="mt-3 text-sm leading-6 text-muted">Σύρε εδώ το PDF ή πάτησε για επιλογή από τον υπολογιστή.</p>
                    <span className="mt-8 rounded-full border border-paper/20 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-paper/75">PDF έως 20 MB</span>
                  </>
                )}
              </div>
            </div>
            <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={onInputChange} className="sr-only" />
            {error && <p className="mt-4 rounded-2xl border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</p>}
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-paper/10 py-5 text-[11px] uppercase tracking-[0.16em] text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>Built for the next pick</span>
          <span>Τα δεδομένα μένουν στον browser σου</span>
        </footer>
      </div>
    </main>
  );
}
