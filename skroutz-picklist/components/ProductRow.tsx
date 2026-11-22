import { Check, Minus, Package, Plus, ScanLine, ShieldQuestion, Trash2 } from "lucide-react";
import Image from "next/image";
import { XLSX_DEFAULT_CATEGORY } from "@/lib/xlsx/parseStockList";
import type { Product } from "@/types/product";

type ProductRowProps = {
  product: Product;
  onChangeQuantity: (id: string, nextQuantity: number) => void;
  onCollect: (id: string) => void;
  onChangeTarget?: (id: string, target: number) => void;
  onRemove?: (product: Product) => void;
};

const targetButtonClass = "grid size-9 shrink-0 place-items-center text-teal transition hover:bg-mint disabled:cursor-not-allowed disabled:text-muted/50 disabled:hover:bg-transparent";

export function ProductRow({ product, onChangeQuantity, onCollect, onChangeTarget, onRemove }: ProductRowProps) {
  const isComplete = product.pickedQuantity === product.quantity;
  const showStock = !!onChangeTarget;
  const marketplaceStock = product.marketplaceStock ?? product.quantity;
  const minimumTarget = Math.max(1, product.pickedQuantity);
  const PlaceholderIcon = showStock ? Package : ShieldQuestion;
  return (
    <article className={`product-row group flex flex-col gap-4 rounded-[22px] border p-4 transition sm:flex-row sm:items-center ${onRemove ? "relative sm:pr-14" : ""} ${isComplete ? "border-teal/20 bg-mint/55" : "border-line bg-white hover:border-teal/35 hover:shadow-[0_12px_35px_rgba(15,28,26,0.06)]"}`}>
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(product)}
          title="Αφαίρεση από τη λίστα"
          aria-label={`Αφαίρεση από τη λίστα: ${product.title}`}
          className="absolute right-3 top-3 grid size-10 place-items-center rounded-xl border border-line bg-white text-muted transition hover:border-coral/50 hover:bg-coral/10 hover:text-coral"
        >
          <Trash2 size={17} />
        </button>
      )}
      <div className={`relative grid size-[92px] shrink-0 place-items-center overflow-hidden rounded-2xl ${product.image ? "bg-white" : "bg-[#eef1e9]"}`}>
        {product.image ? <Image src={product.image} alt="" width={92} height={92} unoptimized className="size-full object-contain p-2" /> : <PlaceholderIcon size={28} className="text-muted/60" />}
        {isComplete && <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-teal text-white"><Check size={14} strokeWidth={3} /></span>}
      </div>
      <div className={`min-w-0 flex-1 ${isComplete ? "opacity-65" : ""}`}>
        <h3 className="font-display text-[16px] font-semibold leading-snug tracking-[-0.025em] text-ink sm:text-[17px]">{product.title}</h3>
        {showStock && product.category && product.category !== XLSX_DEFAULT_CATEGORY && (
          <p className="mt-1 text-xs font-medium leading-snug text-muted">{product.category}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-muted">
          {!showStock && <span><b className="font-bold text-ink/70">MPN:</b> {product.mpn}</span>}
          <span className="inline-flex items-center gap-1"><b className="font-bold text-ink/70">EAN:</b> <span className="font-mono tracking-[0.06em] text-ink/80">{product.ean}</span></span>
          {showStock && <span><b className="font-bold text-ink/70">Stock καταστήματος:</b> {marketplaceStock}</span>}
        </div>
        {onChangeTarget && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-muted">Στόχος συλλογής</span>
            <div className="flex items-center gap-0.5 rounded-xl border border-line bg-white p-0.5">
              <button
                type="button"
                onClick={() => onChangeTarget(product.id, product.quantity - 1)}
                disabled={product.quantity <= minimumTarget}
                aria-label={`Μείωση στόχου για ${product.title}`}
                className={`rounded-lg ${targetButtonClass}`}
              >
                <Minus size={15} />
              </button>
              <input
                key={product.quantity}
                type="number"
                inputMode="numeric"
                min={minimumTarget}
                max={marketplaceStock}
                step={1}
                required
                defaultValue={product.quantity}
                aria-label={`Στόχος συλλογής για ${product.title}`}
                onFocus={(event) => event.currentTarget.select()}
                onBlur={(event) => {
                  const input = event.currentTarget;
                  if (input.validity.valid) onChangeTarget(product.id, input.valueAsNumber);
                  else input.value = String(product.quantity);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") event.currentTarget.value = String(product.quantity);
                  if (event.key === "Enter" || event.key === "Escape") event.currentTarget.blur();
                }}
                className="h-9 w-14 rounded-lg border border-transparent bg-transparent text-center font-bold tabular-nums text-teal [appearance:textfield] hover:border-line focus-visible:outline-teal [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => onChangeTarget(product.id, product.quantity + 1)}
                disabled={product.quantity >= marketplaceStock}
                aria-label={`Αύξηση στόχου για ${product.title}`}
                className={`rounded-lg ${targetButtonClass}`}
              >
                <Plus size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-line pt-3 sm:w-[154px] sm:flex-col sm:items-stretch sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
        <button
          type="button"
          onClick={() => onCollect(product.id)}
          disabled={isComplete}
          aria-label={isComplete ? `Το ${product.title} είναι ολοκληρωμένο` : `Σάρωση EAN για ${product.title}`}
          className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-bold transition ${isComplete ? "cursor-default text-teal" : "text-muted hover:bg-mint hover:text-teal"}`}
        >
          {isComplete ? <Check size={16} strokeWidth={3} /> : <ScanLine size={16} />}
          <span>{isComplete ? "Έτοιμο" : "Συλλογή"}</span>
        </button>
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => onChangeQuantity(product.id, product.pickedQuantity - 1)} disabled={product.pickedQuantity === 0} aria-label={`Μείωση ποσότητας για ${product.title}`} className="grid size-10 place-items-center rounded-xl border border-line bg-white text-muted transition hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"><Minus size={17} /></button>
          <span className={`min-w-[48px] text-center font-display text-xl font-semibold tracking-[-0.04em] ${isComplete ? "text-teal" : "text-ink"}`}>{product.pickedQuantity}<span className="text-sm font-medium text-muted"> / {product.quantity}</span></span>
          <button type="button" onClick={() => onChangeQuantity(product.id, product.pickedQuantity + 1)} disabled={isComplete} aria-label={`Αύξηση ποσότητας για ${product.title}`} className="grid size-10 place-items-center rounded-xl bg-teal text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"><Plus size={18} /></button>
        </div>
      </div>
    </article>
  );
}
