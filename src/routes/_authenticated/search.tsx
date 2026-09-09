import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, ImageOff, Loader2, RefreshCw, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { searchProducts } from "@/lib/food.functions";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [
      { title: "Search a product — NutriMatch" },
      {
        name: "description",
        content:
          "Find a packaged food by product name, brand or keyword and open its label information.",
      },
      { property: "og:title", content: "Search a product — NutriMatch" },
      {
        property: "og:description",
        content: "Look up a product by name when you can't scan the pack.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const search = useServerFn(searchProducts);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQuery(input.trim()), 400);
    return () => clearTimeout(t);
  }, [input]);

  const results = useQuery({
    queryKey: ["food-search", query],
    queryFn: () => search({ data: { query } }),
    enabled: query.length >= 2,
    staleTime: 60 * 1000,
  });

  const list = results.data?.status === "ok" ? results.data.results : [];

  return (
    <AppShell title="Search a product" subtitle="By product name, brand or keyword.">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          value={input}
          maxLength={80}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Granola bar, yoghurt, soup…"
          aria-label="Search products"
          className="w-full rounded-2xl border border-input bg-card py-3.5 pr-4 pl-11 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {query.length < 2 ? (
        <p className="card-soft mt-5 p-5 text-sm text-muted-foreground">
          Type at least two letters to start searching.
        </p>
      ) : results.isFetching ? (
        <ul className="mt-4 space-y-2.5" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="card-soft flex items-center gap-4 p-4">
              <div className="size-14 animate-pulse rounded-2xl bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              </div>
            </li>
          ))}
        </ul>
      ) : results.isError || results.data?.status === "unavailable" ? (
        <section className="card-soft mt-5 p-5">
          <p className="text-sm text-muted-foreground">
            Product search isn't responding right now. Please check your connection and try again.
          </p>
          <button
            onClick={() => void results.refetch()}
            className="font-display mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </button>
        </section>
      ) : list.length === 0 ? (
        <section className="card-soft mt-5 p-5">
          <p className="text-sm text-muted-foreground">
            No products match that yet. Try a shorter search, or scan the pack.
          </p>
          <Link
            to="/scan"
            className="font-display mt-4 inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-5 py-3 text-sm font-semibold transition-colors hover:bg-surface"
          >
            Scan a product
          </Link>
        </section>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {list.map((p) => (
            <li key={p.barcode}>
              <Link
                to="/product/$barcode"
                params={{ barcode: p.barcode }}
                className="card-soft flex items-center gap-4 p-4 transition-shadow hover:shadow-lift"
              >
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt=""
                    loading="lazy"
                    className="size-14 shrink-0 rounded-2xl bg-surface object-contain ring-1 ring-border"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="grid size-14 shrink-0 place-items-center rounded-2xl bg-surface ring-1 ring-border"
                  >
                    <ImageOff className="size-5 text-muted-foreground" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {p.name ?? "Name unavailable"}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {p.brand ?? "Brand unavailable"}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {results.isFetching && query.length >= 2 && (
        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Searching…
        </p>
      )}
    </AppShell>
  );
}
