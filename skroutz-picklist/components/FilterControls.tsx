import { Search } from "lucide-react";

export type Filter = "all" | "pending" | "completed" | "removed";

type FilterControlsProps = {
  filter: Filter;
  search: string;
  onFilterChange: (filter: Filter) => void;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  showRemoved?: boolean;
};

const filters: Array<{ id: Filter; label: string }> = [
  { id: "pending", label: "Εκκρεμή" },
  { id: "completed", label: "Ολοκληρωμένα" },
  { id: "all", label: "Όλα" },
];
const stockFilters = [...filters, { id: "removed", label: "Αφαιρεμένα" } as const];

export function FilterControls({ filter, search, onFilterChange, onSearchChange, searchPlaceholder = "Αναζήτηση EAN, MPN ή τίτλου", showRemoved = false }: FilterControlsProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className={`flex rounded-2xl bg-mint p-1 ${showRemoved ? "flex-wrap" : ""}`}>
        {(showRemoved ? stockFilters : filters).map((item) => <button key={item.id} type="button" onClick={() => onFilterChange(item.id)} className={`rounded-xl py-2.5 text-sm font-bold transition ${showRemoved ? "px-2.5 sm:px-4" : "px-4"} ${filter === item.id ? "bg-teal text-white shadow-sm" : "text-muted hover:text-ink"}`}>{item.label}</button>)}
      </div>
      <label className="flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-line bg-white px-4 text-muted shadow-sm sm:w-[310px]">
        <Search size={18} />
        <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={searchPlaceholder} className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none placeholder:text-muted/70" />
      </label>
    </div>
  );
}
