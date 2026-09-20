import { Check, PackageOpen } from "lucide-react";

type ProgressHeaderProps = {
  productCount: number;
  unitCount: number;
  pickedUnits: number;
  completedProducts: number;
  compact?: boolean;
};

export function ProgressHeader({ productCount, unitCount, pickedUnits, completedProducts, compact = false }: ProgressHeaderProps) {
  const progress = unitCount ? Math.round((pickedUnits / unitCount) * 100) : 0;

  if (compact) {
    return (
      <section className="rounded-2xl border border-line/80 bg-white/95 px-3 py-2 shadow-[0_8px_24px_rgba(15,28,26,0.08)] backdrop-blur sm:px-4 sm:py-2.5" aria-label="Πρόοδος συλλογής">
        <div className="flex items-center gap-3">
          <div className="flex shrink-0 items-baseline gap-1 font-display">
            <span className="text-lg font-semibold tracking-[-0.05em] text-teal">{pickedUnits}</span>
            <span className="text-xs font-medium text-muted">/ {unitCount} τεμ.</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              <span className="truncate">{completedProducts} / {productCount} προϊόντα</span>
              <span className="shrink-0">μένουν {Math.max(0, unitCount - pickedUnits)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-mint"><div className="h-full rounded-full bg-teal transition-[width] duration-500" style={{ width: `${progress}%` }} /></div>
          </div>
          <span className="shrink-0 font-display text-lg font-semibold tracking-[-0.05em] text-teal">{progress}%</span>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[26px] border border-line bg-white p-5 shadow-[0_18px_60px_rgba(15,28,26,0.06)] sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
            <PackageOpen size={15} className="text-teal" /> Παραγγελία
          </div>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-7 gap-y-2">
            <span className="font-display text-3xl font-semibold tracking-[-0.06em] text-ink">{productCount} <small className="font-sans text-sm font-semibold tracking-normal text-muted">προϊόντα</small></span>
            <span className="font-display text-3xl font-semibold tracking-[-0.06em] text-ink">{unitCount} <small className="font-sans text-sm font-semibold tracking-normal text-muted">τεμάχια</small></span>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-mint px-4 py-3">
          <div className="grid size-9 place-items-center rounded-xl bg-teal text-white"><Check size={17} strokeWidth={2.8} /></div>
          <div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Ολοκληρωμένα</p><p className="mt-0.5 font-display text-2xl font-semibold leading-none tracking-[-0.05em] text-ink">{completedProducts} <span className="font-sans text-sm font-medium tracking-normal text-muted">/ {productCount}</span></p></div>
        </div>
      </div>
      <div className="mt-7">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted"><span>Πρόοδος συλλογής</span><span className="text-teal">{progress}%</span></div>
        <div className="h-3 overflow-hidden rounded-full bg-mint"><div className="h-full rounded-full bg-teal transition-[width] duration-500" style={{ width: `${progress}%` }} /></div>
      </div>
    </section>
  );
}
