"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowUp, Check, FilePlus2, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { FilterControls, type Filter } from "@/components/FilterControls";
import { Logo } from "@/components/Logo";
import { ProductRow } from "@/components/ProductRow";
import { ProgressHeader } from "@/components/ProgressHeader";
import { clearStoredOrder, readStoredOrder, stockListStorage, storageErrorMessage, writeStoredOrder } from "@/lib/storage";
import type { Product, StoredOrder } from "@/types/product";

type Feedback = { type: "success" | "error"; title: string; detail?: string };

const checklistSources = {
  pdf: {
    storage: { read: readStoredOrder, write: writeStoredOrder, clear: clearStoredOrder },
    home: "/",
    format: "PDF",
    title: "Η λίστα σου.",
    emptyTitle: "Δεν υπάρχει ενεργή παραγγελία",
    emptyDescription: "Ανέβασε ένα PDF λίστας παραγγελίας για να ξεκινήσεις τη συλλογή.",
    newList: "Νέα παραγγελία",
    confirmNewList: "Να διαγραφεί η τρέχουσα παραγγελία και να ανέβει νέα;",
    missingProduct: "Το προϊόν δεν υπάρχει στην παραγγελία",
    warningAdvice: "Έλεγξε το αρχικό PDF πριν ολοκληρώσεις την αποστολή.",
  },
  xlsx: {
    storage: stockListStorage,
    home: "/#xlsx",
    format: "XLSX",
    title: "Λίστα συλλογής αποθέματος FBS",
    emptyTitle: "Δεν υπάρχει ενεργή λίστα XLSX",
    emptyDescription: "Ανέβασε ένα XLSX αποθέματος για να ξεκινήσεις τη συλλογή.",
    newList: "Νέα λίστα XLSX",
    confirmNewList: "Να διαγραφεί η τρέχουσα λίστα XLSX και η πρόοδός της;",
    missingProduct: "Το προϊόν δεν υπάρχει στη λίστα αποθέματος",
    warningAdvice: "Έλεγξε τις γραμμές στο αρχικό XLSX.",
  },
} as const;

function normalizeCode(value: string) {
  return value.replace(/\D/g, "");
}

export default function ChecklistPage({ source = "pdf" }: { source?: keyof typeof checklistSources }) {
  const router = useRouter();
  const settings = checklistSources[source];
  const { storage } = settings;
  const isXlsx = source === "xlsx";
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [storageError, setStorageError] = useState("");
  const leavingRef = useRef(false);
  const [filter, setFilter] = useState<Filter>("pending");
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTargetId, setScannerTargetId] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void storage.read().then((stored) => {
      if (!cancelled) setOrder(stored);
    }).catch((error: unknown) => {
      if (!cancelled) setStorageError(storageErrorMessage(error));
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [storage]);

  useEffect(() => {
    if (!order || leavingRef.current) return;
    let cancelled = false;
    void storage.write(order).then(() => {
      if (!cancelled) setStorageError("");
    }).catch((error: unknown) => {
      if (!cancelled) setStorageError(`Η τελευταία πρόοδος δεν αποθηκεύτηκε. ${storageErrorMessage(error)}`);
    });
    return () => { cancelled = true; };
  }, [order, storage]);

  useEffect(() => {
    const timeout = feedback ? window.setTimeout(() => setFeedback(null), 3600) : undefined;
    return () => { if (timeout) window.clearTimeout(timeout); };
  }, [feedback]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 420);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const products = useMemo(() => order?.products ?? [], [order]);
  const unitCount = useMemo(() => products.reduce((sum, product) => sum + product.quantity, 0), [products]);
  const pickedUnits = useMemo(() => products.reduce((sum, product) => sum + product.pickedQuantity, 0), [products]);
  const completedProducts = useMemo(() => products.filter((product) => product.pickedQuantity === product.quantity).length, [products]);

  const updateQuantity = useCallback((id: string, nextQuantity: number) => {
    if (leavingRef.current) return;
    setOrder((current) => current ? { ...current, products: current.products.map((product) => product.id === id ? { ...product, pickedQuantity: Math.max(0, Math.min(product.quantity, nextQuantity)) } : product) } : current);
  }, []);

  function updateTarget(id: string, target: number) {
    if (!isXlsx || leavingRef.current || !Number.isSafeInteger(target)) return;
    setOrder((current) => {
      if (!current) return current;
      const product = current.products.find((item) => item.id === id);
      if (!product || product.quantity === target) return current;
      const marketplaceStock = product.marketplaceStock ?? product.quantity;
      if (target < Math.max(1, product.pickedQuantity) || target > marketplaceStock) return current;
      return {
        ...current,
        products: current.products.map((item) => item.id === id ? { ...item, quantity: target, marketplaceStock } : item),
      };
    });
  }

  function removeProduct(product: Product) {
    if (!isXlsx || leavingRef.current) return;
    const pickedNotice = product.pickedQuantity > 0
      ? `\n\nΤα ${product.pickedQuantity} τεμάχια που έχεις καταχωρίσει θα αφαιρεθούν από την πρόοδο.`
      : "";
    if (!window.confirm(`Να αφαιρεθεί το «${product.title}» από τη λίστα;${pickedNotice}`)) return;

    setOrder((current) => current ? { ...current, products: current.products.filter((item) => item.id !== product.id) } : current);
    setFeedback({ type: "success", title: "Αφαιρέθηκε από τη λίστα", detail: product.title });
  }

  const showScanFeedback = useCallback((nextFeedback: Feedback) => {
    setFeedback(nextFeedback);
  }, []);

  const handleScan = useCallback((rawValue: string, targetProductId?: string | null) => {
    const ean = normalizeCode(rawValue);
    if (!ean) return;
    const targetProduct = targetProductId ? products.find((item) => item.id === targetProductId) : undefined;

    if (targetProduct && normalizeCode(targetProduct.ean) !== ean) {
      showScanFeedback({
        type: "error",
        title: "Λάθος προϊόν",
        detail: `Αναμενόμενο EAN: ${targetProduct.ean} · Σκαναρίστηκε: ${ean}`,
      });
      return;
    }

    const matchingProducts = targetProduct ? [targetProduct] : products.filter((item) => normalizeCode(item.ean) === ean);
    const product = matchingProducts.find((item) => item.pickedQuantity < item.quantity) ?? matchingProducts[0];
    if (!product) {
      showScanFeedback({ type: "error", title: settings.missingProduct, detail: `EAN: ${ean}` });
      return;
    }
    if (product.pickedQuantity >= product.quantity) {
      showScanFeedback({ type: "error", title: "Το προϊόν έχει ήδη ολοκληρωθεί", detail: `${product.pickedQuantity} / ${product.quantity}` });
      return;
    }

    const next = product.pickedQuantity + 1;
    updateQuantity(product.id, next);
    showScanFeedback(next === product.quantity ? { type: "success", title: `Ολοκληρώθηκε: ${product.title}` } : { type: "success", title: `Προστέθηκε: ${product.title}`, detail: `${next} / ${product.quantity}` });
  }, [products, settings.missingProduct, showScanFeedback, updateQuantity]);

  const scannerTargetProduct = useMemo(
    () => (scannerTargetId ? products.find((product) => product.id === scannerTargetId) : undefined),
    [products, scannerTargetId],
  );

  const closeScanner = useCallback(() => {
    setIsScannerOpen(false);
    setScannerTargetId(null);
  }, []);

  const openProductScanner = useCallback((productId: string) => {
    setFeedback(null);
    setScannerTargetId(productId);
    setIsScannerOpen(true);
  }, []);

  const handleCameraDetected = useCallback((code: string) => {
    const targetProductId = scannerTargetId;
    closeScanner();
    handleScan(code, targetProductId);
  }, [closeScanner, handleScan, scannerTargetId]);

  function resetProgress() {
    if (leavingRef.current) return;
    if (!window.confirm("Να μηδενιστεί η πρόοδος συλλογής;")) return;
    setOrder((current) => current ? { ...current, products: current.products.map((product) => ({ ...product, pickedQuantity: 0 })) } : current);
  }

  async function newOrder() {
    if (leavingRef.current) return;
    if (!window.confirm(settings.confirmNewList)) return;
    leavingRef.current = true;
    try {
      await storage.clear();
      router.push(settings.home);
    } catch (error) {
      leavingRef.current = false;
      setStorageError(storageErrorMessage(error));
    }
  }

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products
      .filter((product) => filter === "all" || (filter === "completed" ? product.pickedQuantity === product.quantity : product.pickedQuantity < product.quantity))
      .filter((product) => {
        if (!query) return true;
        const searchable = [product.title, product.ean, isXlsx ? product.category : product.mpn];
        return searchable.some((value) => value.toLowerCase().includes(query));
      })
      .sort((a, b) => Number(a.pickedQuantity === a.quantity) - Number(b.pickedQuantity === b.quantity) || a.originalIndex - b.originalIndex);
  }, [filter, isXlsx, products, search]);

  const groupedProducts = useMemo(() => {
    if (isXlsx) {
      const categories = new Map<string, Product[]>();
      for (const product of visibleProducts) {
        const group = categories.get(product.category);
        if (group) group.push(product);
        else categories.set(product.category, [product]);
      }
      return Array.from(categories, ([category, products]) => ({ category, products }));
    }

    const groups: Array<{ category: string; products: Product[] }> = [];
    visibleProducts.forEach((product) => {
      const previous = groups[groups.length - 1];
      if (previous?.category === product.category && (previous.products[0]?.pickedQuantity === previous.products[0]?.quantity) === (product.pickedQuantity === product.quantity)) previous.products.push(product);
      else groups.push({ category: product.category, products: [product] });
    });
    return groups;
  }, [isXlsx, visibleProducts]);

  if (isLoading || (!order && storageError)) {
    return <main className="min-h-screen bg-cream px-5 py-12 text-center text-ink"><Logo /><p role="status" className="mt-12">{isLoading ? "Φόρτωση αποθηκευμένης λίστας…" : storageError}</p>{!isLoading && <button type="button" className="mt-6 rounded-xl bg-teal px-5 py-3 text-white" onClick={() => window.location.reload()}>Δοκίμασε ξανά</button>}</main>;
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-cream px-5 py-5 sm:px-8 lg:px-12">
        <div className="mx-auto flex min-h-[90vh] max-w-5xl flex-col"><header><Logo /></header><div className="flex flex-1 flex-col items-center justify-center text-center"><div className="grid size-16 place-items-center rounded-2xl bg-mint text-teal"><FilePlus2 size={27} /></div><h1 className="mt-6 font-display text-4xl font-semibold tracking-[-0.06em] text-ink">{settings.emptyTitle}</h1><p className="mt-3 max-w-md text-muted">{settings.emptyDescription}</p><button type="button" onClick={() => router.push(settings.home)} className="mt-8 rounded-2xl bg-teal px-5 py-3 text-sm font-bold text-white transition hover:bg-ink">Ανέβασε {settings.format}</button></div></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream text-ink">
      {isScannerOpen && (
        <BarcodeScanner
          expectedProduct={scannerTargetProduct}
          onDetected={handleCameraDetected}
          onClose={closeScanner}
        />
      )}
      {showScrollTop && <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-5 left-5 z-30 grid size-10 place-items-center rounded-xl border border-line bg-white/95 text-muted shadow-lg backdrop-blur transition hover:border-teal hover:bg-teal hover:text-white sm:bottom-7 sm:left-8" aria-label="Επιστροφή στην κορυφή" title="Πάνω"><ArrowUp size={17} /></button>}
      <header className="sticky top-0 z-20 border-b border-line/80 bg-cream/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12"><Logo /><div className="flex items-center gap-2"><button type="button" onClick={resetProgress} className="hidden items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-muted transition hover:bg-white hover:text-ink sm:flex"><RotateCcw size={15} /> Μηδενισμός προόδου</button><button type="button" onClick={newOrder} className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-ink transition hover:border-coral hover:text-coral"><FilePlus2 size={15} /> <span className="hidden sm:inline">{settings.newList}</span><span className="sm:hidden">Νέα</span></button></div></div>
      </header>
      <div className="mx-auto max-w-[1440px] px-5 pb-16 pt-7 sm:px-8 lg:px-12 lg:pt-10">
        {!!order.warnings?.length && <div role="alert" className="mb-6 rounded-2xl border border-coral/40 bg-coral/10 px-4 py-4 text-sm text-coral"><p className="font-bold">Προσοχή: η λίστα δεν είναι πλήρης</p><p className="mt-2">Οι παρακάτω προβληματικές γραμμές δεν μπήκαν στη συλλογή. Η πρόοδος αφορά μόνο τα {products.length} προϊόντα που διαβάστηκαν πλήρως. {settings.warningAdvice}</p><ul className="mt-3 space-y-2">{order.warnings.map((warning, index) => <li key={index}><span className="font-semibold">{warning.productTitle}</span> — {warning.message}</li>)}</ul></div>}
        {storageError && <div role="alert" className="mb-6 rounded-2xl border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-coral"><p>{storageError}</p><button type="button" className="mt-2 underline" onClick={() => { void storage.write(order).then(() => setStorageError("")).catch((error: unknown) => setStorageError(storageErrorMessage(error))); }}>Επανάληψη αποθήκευσης</button></div>}
        <div className="mb-7"><button type="button" onClick={() => router.push(settings.home)} className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-muted transition hover:text-teal"><ArrowLeft size={14} /> {isXlsx ? "αρχική" : "νέα εισαγωγή"}</button><h1 className="font-display text-4xl font-semibold tracking-[-0.07em] sm:text-5xl">{settings.title}</h1><p className="mt-2 text-sm text-muted">{order.sourceName} <span className="mx-2 text-line">·</span> έτοιμη για συλλογή</p></div>
        {feedback && <div className={`mb-6 flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-semibold shadow-sm ${feedback.type === "success" ? "border-teal/20 bg-mint text-teal" : "border-coral/30 bg-coral/10 text-coral"}`}><div className={`grid size-7 shrink-0 place-items-center rounded-full ${feedback.type === "success" ? "bg-teal text-white" : "bg-coral text-white"}`}>{feedback.type === "success" ? <Check size={15} strokeWidth={3} /> : <AlertTriangle size={15} />}</div><div className="min-w-0 flex-1"><p className="truncate">{feedback.title}</p>{feedback.detail && <p className="mt-0.5 text-xs font-medium opacity-75">{feedback.detail}</p>}</div><button type="button" onClick={() => setFeedback(null)} aria-label="Κλείσιμο μηνύματος"><X size={16} /></button></div>}
        <div className="sticky top-[73px] z-10 -mx-5 mb-1 border-y border-line/80 bg-cream/90 px-5 py-2 backdrop-blur-md sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
          <div className="mx-auto max-w-[1440px]">
            {!!order.warnings?.length && <p className="mb-2 text-xs font-bold text-coral">Μερική λίστα · {order.warnings.length} προβληματικές γραμμές — έλεγξε το {settings.format}</p>}
            <ProgressHeader compact productCount={products.length} unitCount={unitCount} pickedUnits={pickedUnits} completedProducts={completedProducts} />
          </div>
        </div>
        <div className="mt-7"><FilterControls filter={filter} search={search} onFilterChange={setFilter} onSearchChange={setSearch} searchPlaceholder={isXlsx ? "Αναζήτηση EAN, ονόματος ή κατηγορίας" : undefined} /></div>
        <div className="mt-8 space-y-8">{groupedProducts.length > 0 ? groupedProducts.map((group, groupIndex) => <section key={isXlsx ? group.category : `${group.category}-${group.products[0]?.originalIndex ?? groupIndex}`}><div className="mb-3 flex items-center gap-3"><h2 className="font-display text-xl font-semibold tracking-[-0.04em] text-ink">{group.category}</h2><span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-muted shadow-sm">{group.products.length}</span></div><div className="space-y-3">{group.products.map((product) => <ProductRow key={product.id} product={product} onChangeQuantity={updateQuantity} onCollect={openProductScanner} onChangeTarget={isXlsx ? updateTarget : undefined} onRemove={isXlsx ? removeProduct : undefined} />)}</div></section>) : <div className="rounded-[26px] border border-dashed border-line bg-white px-6 py-16 text-center"><p className="font-display text-xl font-semibold tracking-[-0.04em]">{isXlsx && products.length === 0 ? "Η λίστα FBS είναι κενή" : "Δεν βρέθηκαν προϊόντα"}</p><p className="mt-2 text-sm text-muted">{isXlsx && products.length === 0 ? "Ανέβασε ένα XLSX για να ξεκινήσεις νέα συλλογή." : "Δοκίμασε διαφορετικό φίλτρο ή όρο αναζήτησης."}</p></div>}</div>
      </div>
    </main>
  );
}
