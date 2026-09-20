import { Check, PackageOpen } from "lucide-react";

type ProgressHeaderProps = {
  productCount: number;
  unitCount: number;
  pickedUnits: number;
  completedProducts: number;
};

export function ProgressHeader({ productCount, unitCount, pickedUnits, completedProducts }: ProgressHeaderProps) {
  const progress = unitCount ? Math.round((pickedUnits / unitCount) * 100) : 0;
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
