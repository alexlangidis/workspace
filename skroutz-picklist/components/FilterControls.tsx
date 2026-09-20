import { Search } from "lucide-react";

export type Filter = "all" | "pending" | "completed";

type FilterControlsProps = {
  filter: Filter;
  search: string;
  onFilterChange: (filter: Filter) => void;
  onSearchChange: (value: string) => void;
};

const filters: Array<{ id: Filter; label: string }> = [
  { id: "pending", label: "Εκκρεμή" },
  { id: "completed", label: "Ολοκληρωμένα" },
  { id: "all", label: "Όλα" },
];

export function FilterControls({ filter, search, onFilterChange, onSearchChange }: FilterControlsProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex rounded-2xl bg-mint p-1">
        {filters.map((item) => <button key={item.id} type="button" onClick={() => onFilterChange(item.id)} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${filter === item.id ? "bg-teal text-white shadow-sm" : "text-muted hover:text-ink"}`}>{item.label}</button>)}
      </div>
      <label className="flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-line bg-white px-4 text-muted shadow-sm sm:w-[310px]">
        <Search size={18} />
        <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Αναζήτηση EAN, MPN ή τίτλου" className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none placeholder:text-muted/70" />
      </label>
    </div>
  );
}
