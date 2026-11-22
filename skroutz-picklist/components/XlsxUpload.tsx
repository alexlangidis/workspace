"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { ArrowRight, FileSpreadsheet, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { stockListStorage, storageErrorMessage } from "@/lib/storage";
import { parseStockSheets, XLSX_MAX_BYTES } from "@/lib/xlsx/parseStockList";

export function XlsxUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasList, setHasList] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void stockListStorage.read().then((list) => {
      if (active) setHasList(!!list?.products.length);
    }).catch(() => { /* Upload reports storage failures when writing. */ });
    return () => { active = false; };
  }, []);

  async function processFile(file?: File) {
    if (!file || processingRef.current) return;
    setError("");
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError("Επίλεξε ένα αρχείο XLSX για να συνεχίσεις.");
      return;
    }
    if (file.size > XLSX_MAX_BYTES) {
      setError("Το XLSX πρέπει να είναι έως 20 MB.");
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);
    try {
      const { default: readWorkbook } = await import("read-excel-file/browser");
      const sheets = await readWorkbook(file).catch(() => {
        throw new Error("Δεν ήταν δυνατή η ανάγνωση του XLSX. Έλεγξε το αρχείο και δοκίμασε ξανά.");
      });
      const { products, warnings } = parseStockSheets(sheets);
      const current = await stockListStorage.read().catch((error: unknown) => { throw new Error(storageErrorMessage(error)); });
      if (current?.products.length && !window.confirm("Να αντικατασταθεί η τρέχουσα λίστα XLSX και η πρόοδός της;")) {
        setIsProcessing(false);
        processingRef.current = false;
        return;
      }
      await stockListStorage.write({
        products,
        warnings,
        sourceName: file.name,
        parsedAt: new Date().toISOString(),
      }).catch((error: unknown) => { throw new Error(storageErrorMessage(error)); });
      router.push("/checklist/xlsx");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Η εισαγωγή XLSX απέτυχε.");
      setIsProcessing(false);
      processingRef.current = false;
    }
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);
    void processFile(event.dataTransfer.files[0]);
  }

  return (
    <section id="xlsx" aria-label="Εισαγωγή XLSX" className="mt-4 scroll-mt-5">
      <div
        onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
        onDragLeave={(event) => {
          if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setIsDragging(false);
        }}
        onDrop={onDrop}
        className={`overflow-hidden rounded-[26px] border transition ${isDragging ? "border-lime bg-lime/10" : "border-paper/15 bg-paper/[0.06] hover:border-lime/60 hover:bg-paper/[0.09]"}`}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isProcessing}
          aria-busy={isProcessing}
          className="group flex w-full items-center gap-4 px-5 py-5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lime disabled:cursor-wait sm:gap-5 sm:px-7"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-lime/15 text-lime sm:size-14">
            {isProcessing ? <LoaderCircle size={24} className="animate-spin" /> : <FileSpreadsheet size={24} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-semibold tracking-[-0.03em] sm:text-xl">
              {isProcessing ? "Γίνεται επεξεργασία XLSX…" : "Ανέβασε λίστα αποθέματος FBS"}
            </span>
            <span className="mt-1 block text-sm leading-5 text-muted">Σύρε ή επίλεξε XLSX με EAN, Name, Marketplace stock και προαιρετικά Category.</span>
          </span>
          <span className="hidden rounded-full border border-paper/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-paper/75 sm:inline">XLSX</span>
        </button>
        {hasList && (
          <Link href="/checklist/xlsx" className="flex items-center justify-between gap-2 border-t border-paper/10 px-5 py-3 text-sm font-semibold text-lime hover:bg-white/5 sm:px-7">
            Συνέχισε τη λίστα FBS <ArrowRight size={16} />
          </Link>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        aria-label="Αρχείο XLSX"
        hidden
        onChange={(event) => {
          void processFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {error && <p role="alert" className="mt-4 rounded-2xl border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</p>}
    </section>
  );
}
