import { PackageCheck } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-[14px] bg-lime text-ink shadow-[0_8px_24px_rgba(199,243,107,0.18)]">
        <PackageCheck size={21} strokeWidth={2.4} />
      </div>
      <div>
        <p className="font-display text-[17px] font-bold leading-none tracking-[-0.05em]">skroutz-picklist</p>
        <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.24em] text-muted">warehouse flow</p>
      </div>
    </div>
  );
}
