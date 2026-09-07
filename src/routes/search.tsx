import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { AppShell, MatchBadge, ProductTile } from "@/components/app-shell";
import { matchProduct, searchProducts } from "@/lib/nutrimatch";
import { useNutriMatch } from "@/lib/store";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search a product — NutriMatch" },
      {
        name: "description",
        content:
          "Find a packaged food by name, brand or barcode and see how it matches your nutrition goal.",
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
  const { profile } = useNutriMatch();
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchProducts(query.slice(0, 80)), [query]);

  return (
    <AppShell title="Search product" subtitle="By name, brand or barcode.">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          value={query}
          maxLength={80}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Granola bar, yoghurt, soup…"
          aria-label="Search products"
          className="w-full rounded-2xl border border-input bg-card py-3.5 pr-4 pl-11 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {results.length === 0 ? (
        <p className="card-soft mt-5 p-5 text-sm text-muted-foreground">
          No products match that yet. Try a shorter search, or scan the pack.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {results.map((p) => {
            const match = matchProduct(p, profile.goal);
            return (
              <li key={p.id}>
                <Link
                  to="/product/$productId"
                  params={{ productId: p.id }}
                  className="card-soft flex items-center gap-4 p-4 transition-shadow hover:shadow-lift"
                >
                  <ProductTile emoji={p.emoji} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {p.brand} · {p.calories} kcal · {p.serving}
                    </span>
                    <MatchBadge level={match.level} label={match.label} className="mt-2" />
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
