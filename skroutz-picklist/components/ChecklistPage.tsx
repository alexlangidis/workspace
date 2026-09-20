"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, FilePlus2, RotateCcw, ScanLine, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FilterControls, type Filter } from "@/components/FilterControls";
import { Logo } from "@/components/Logo";
import { ProductRow } from "@/components/ProductRow";
import { ProgressHeader } from "@/components/ProgressHeader";
import { readStoredOrder, writeStoredOrder } from "@/lib/storage";
import type { Product, StoredOrder } from "@/types/product";

type Feedback = { type: "success" | "error"; title: string; detail?: string };

function normalizeCode(value: string) {
  return value.replace(/\D/g, "");
}

export default function ChecklistPage() {
  const router = useRouter();
  const scannerRef = useRef<HTMLInputElement>(null);
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [scannerValue, setScannerValue] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setOrder(readStoredOrder()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (order) writeStoredOrder(order);
  }, [order]);

  useEffect(() => {
    const timeout = feedback ? window.setTimeout(() => setFeedback(null), 3600) : undefined;
    return () => { if (timeout) window.clearTimeout(timeout); };
  }, [feedback]);

  const products = useMemo(() => order?.products ?? [], [order]);
  const unitCount = useMemo(() => products.reduce((sum, product) => sum + product.quantity, 0), [products]);
  const pickedUnits = useMemo(() => products.reduce((sum, product) => sum + product.pickedQuantity, 0), [products]);
  const completedProducts = useMemo(() => products.filter((product) => product.pickedQuantity === product.quantity).length, [products]);

  const updateQuantity = useCallback((id: string, nextQuantity: number) => {
    setOrder((current) => current ? { ...current, products: current.products.map((product) => product.id === id ? { ...product, pickedQuantity: Math.max(0, Math.min(product.quantity, nextQuantity)) } : product) } : current);
  }, []);

  function showScanFeedback(nextFeedback: Feedback) {
    setFeedback(nextFeedback);
    setScannerValue("");
    window.setTimeout(() => scannerRef.current?.focus(), 0);
  }

  function handleScan() {
    const ean = normalizeCode(scannerValue);
    if (!ean) return;
    const product = products.find((item) => normalizeCode(item.ean) === ean);
    if (!product) {
      showScanFeedback({ type: "error", title: "Το προϊόν δεν υπάρχει στην παραγγελία", detail: `EAN: ${ean}` });
      return;
    }
    if (product.pickedQuantity >= product.quantity) {
      showScanFeedback({ type: "error", title: "Το προϊόν έχει ήδη ολοκληρωθεί", detail: `${product.pickedQuantity} / ${product.quantity}` });
      return;
    }

    const next = product.pickedQuantity + 1;
    updateQuantity(product.id, next);
    showScanFeedback(next === product.quantity ? { type: "success", title: `Ολοκληρώθηκε: ${product.title}` } : { type: "success", title: `Προστέθηκε: ${product.title}`, detail: `${next} / ${product.quantity}` });
  }

  function resetProgress() {
    if (!window.confirm("Να μηδενιστεί η πρόοδος συλλογής;")) return;
    setOrder((current) => current ? { ...current, products: current.products.map((product) => ({ ...product, pickedQuantity: 0 })) } : current);
    window.setTimeout(() => scannerRef.current?.focus(), 0);
  }

  function newOrder() {
    if (!window.confirm("Να διαγραφεί η τρέχουσα παραγγελία και να ανέβει νέα;")) return;
    window.localStorage.removeItem("picking-list-order-v1");
    router.push("/");
  }

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products
      .filter((product) => filter === "all" || (filter === "completed" ? product.pickedQuantity === product.quantity : product.pickedQuantity < product.quantity))
      .filter((product) => !query || [product.title, product.mpn, product.ean].some((value) => value.toLowerCase().includes(query)))
      .sort((a, b) => Number(a.pickedQuantity === a.quantity) - Number(b.pickedQuantity === b.quantity) || a.originalIndex - b.originalIndex);
  }, [filter, products, search]);

  const groupedProducts = useMemo(() => {
    const groups: Array<{ category: string; products: Product[] }> = [];
    visibleProducts.forEach((product) => {
      const previous = groups[groups.length - 1];
      if (previous?.category === product.category && (previous.products[0]?.pickedQuantity === previous.products[0]?.quantity) === (product.pickedQuantity === product.quantity)) previous.products.push(product);
      else groups.push({ category: product.category, products: [product] });
    });
    return groups;
  }, [visibleProducts]);

  if (!order) {
    return (
      <main className="min-h-screen bg-cream px-5 py-5 sm:px-8 lg:px-12">
        <div className="mx-auto flex min-h-[90vh] max-w-5xl flex-col"><header><Logo /></header><div className="flex flex-1 flex-col items-center justify-center text-center"><div className="grid size-16 place-items-center rounded-2xl bg-mint text-teal"><FilePlus2 size={27} /></div><h1 className="mt-6 font-display text-4xl font-semibold tracking-[-0.06em] text-ink">Δεν υπάρχει ενεργή παραγγελία</h1><p className="mt-3 max-w-md text-muted">Ανέβασε ένα PDF λίστας παραγγελίας για να ξεκινήσεις τη συλλογή.</p><button type="button" onClick={() => router.push("/")} className="mt-8 rounded-2xl bg-teal px-5 py-3 text-sm font-bold text-white transition hover:bg-ink">Ανέβασε PDF</button></div></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream text-ink">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-cream/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12"><Logo /><div className="flex items-center gap-2"><button type="button" onClick={resetProgress} className="hidden items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-muted transition hover:bg-white hover:text-ink sm:flex"><RotateCcw size={15} /> Μηδενισμός προόδου</button><button type="button" onClick={newOrder} className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-ink transition hover:border-coral hover:text-coral"><FilePlus2 size={15} /> <span className="hidden sm:inline">Νέα παραγγελία</span><span className="sm:hidden">Νέα</span></button></div></div>
      </header>
      <div className="mx-auto max-w-[1440px] px-5 pb-16 pt-7 sm:px-8 lg:px-12 lg:pt-10">
        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><button type="button" onClick={() => router.push("/")} className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-muted transition hover:text-teal"><ArrowLeft size={14} /> νέα εισαγωγή</button><h1 className="font-display text-4xl font-semibold tracking-[-0.07em] sm:text-5xl">Η λίστα σου.</h1><p className="mt-2 text-sm text-muted">{order.sourceName} <span className="mx-2 text-line">·</span> έτοιμη για συλλογή</p></div><div className="relative w-full lg:w-[420px]"><label className="flex h-14 items-center gap-3 rounded-2xl bg-ink px-4 text-paper shadow-[0_12px_30px_rgba(15,28,26,0.14)]"><ScanLine size={19} className="shrink-0 text-lime" /><input ref={scannerRef} value={scannerValue} onChange={(event) => setScannerValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); handleScan(); } }} placeholder="Σκάναρε EAN..." className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-paper outline-none placeholder:text-muted" autoComplete="off" /></label><p className="mt-2 text-right text-[10px] font-bold uppercase tracking-[0.14em] text-muted">EAN + Enter · το πεδίο μένει ενεργό</p></div></div>
        {feedback && <div className={`mb-6 flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-semibold shadow-sm ${feedback.type === "success" ? "border-teal/20 bg-mint text-teal" : "border-coral/30 bg-coral/10 text-coral"}`}><div className={`grid size-7 shrink-0 place-items-center rounded-full ${feedback.type === "success" ? "bg-teal text-white" : "bg-coral text-white"}`}>{feedback.type === "success" ? <Check size={15} strokeWidth={3} /> : <AlertTriangle size={15} />}</div><div className="min-w-0 flex-1"><p className="truncate">{feedback.title}</p>{feedback.detail && <p className="mt-0.5 text-xs font-medium opacity-75">{feedback.detail}</p>}</div><button type="button" onClick={() => setFeedback(null)} aria-label="Κλείσιμο μηνύματος"><X size={16} /></button></div>}
        <ProgressHeader productCount={products.length} unitCount={unitCount} pickedUnits={pickedUnits} completedProducts={completedProducts} />
        <div className="mt-7"><FilterControls filter={filter} search={search} onFilterChange={setFilter} onSearchChange={setSearch} /></div>
        <div className="mt-8 space-y-8">{groupedProducts.length > 0 ? groupedProducts.map((group, groupIndex) => <section key={`${group.category}-${group.products[0]?.originalIndex ?? groupIndex}`}><div className="mb-3 flex items-center gap-3"><h2 className="font-display text-xl font-semibold tracking-[-0.04em] text-ink">{group.category}</h2><span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-muted shadow-sm">{group.products.length}</span></div><div className="space-y-3">{group.products.map((product) => <ProductRow key={product.id} product={product} onChangeQuantity={updateQuantity} />)}</div></section>) : <div className="rounded-[26px] border border-dashed border-line bg-white px-6 py-16 text-center"><p className="font-display text-xl font-semibold tracking-[-0.04em]">Δεν βρέθηκαν προϊόντα</p><p className="mt-2 text-sm text-muted">Δοκίμασε διαφορετικό φίλτρο ή όρο αναζήτησης.</p></div>}</div>
      </div>
    </main>
  );
}
