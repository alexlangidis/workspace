import { Check, Minus, Plus, ScanLine, ShieldQuestion } from "lucide-react";
import Image from "next/image";
import type { Product } from "@/types/product";

type ProductRowProps = {
  product: Product;
  onChangeQuantity: (id: string, nextQuantity: number) => void;
  onCollect: (id: string) => void;
};

export function ProductRow({ product, onChangeQuantity, onCollect }: ProductRowProps) {
  const isComplete = product.pickedQuantity === product.quantity;
  return (
    <article className={`product-row group flex flex-col gap-4 rounded-[22px] border p-4 transition sm:flex-row sm:items-center ${isComplete ? "border-teal/20 bg-mint/55" : "border-line bg-white hover:border-teal/35 hover:shadow-[0_12px_35px_rgba(15,28,26,0.06)]"}`}>
      <div className={`relative grid size-[92px] shrink-0 place-items-center overflow-hidden rounded-2xl ${product.image ? "bg-white" : "bg-[#eef1e9]"}`}>
        {product.image ? <Image src={product.image} alt="" width={92} height={92} unoptimized className="size-full object-contain p-2" /> : <ShieldQuestion size={28} className="text-muted/60" />}
        {isComplete && <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-teal text-white"><Check size={14} strokeWidth={3} /></span>}
      </div>
      <div className={`min-w-0 flex-1 ${isComplete ? "opacity-65" : ""}`}>
        <h3 className="font-display text-[16px] font-semibold leading-snug tracking-[-0.025em] text-ink sm:text-[17px]">{product.title}</h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-muted">
          <span><b className="font-bold text-ink/70">MPN:</b> {product.mpn}</span>
          <span className="inline-flex items-center gap-1"><b className="font-bold text-ink/70">EAN:</b> <span className="font-mono tracking-[0.06em] text-ink/80">{product.ean}</span></span>
        </div>
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
