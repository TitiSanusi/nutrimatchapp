import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { countries } from "@/lib/countries";
import { cn } from "@/lib/utils";

export function CountrySelect({
  value,
  onChange,
  id = "country",
  invalid,
}: {
  value: string;
  onChange: (name: string) => void;
  id?: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrap = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? countries.filter((c) => c.name.toLowerCase().includes(q)) : countries;
    return list.slice(0, 120);
  }, [query]);

  // Close on outside interaction only — blur-based closing swallowed option taps.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: Event) => {
      if (!wrap.current?.contains(e.target as Node | null)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          setQuery("");
        }}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-left text-sm outline-none focus:ring-2 focus:ring-ring",
          invalid ? "border-destructive" : "border-input",
        )}
      >
        <span className={value ? "" : "text-muted-foreground"}>
          {value || "Search for your country"}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>

      {open && (
        <div className="card-soft absolute z-30 mt-2 w-full overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              value={query}
              maxLength={60}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a country name"
              aria-label="Search countries"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {results.length === 0 && (
              <li className="px-4 py-3 text-sm text-muted-foreground">
                No country matches “{query.trim()}”.
              </li>
            )}
            {results.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.name === value}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    onChange(c.name);
                    setOpen(false);
                  }}
                  onClick={() => {
                    onChange(c.name);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface"
                >
                  {c.name}
                  {c.name === value && <Check className="size-4 text-primary" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
