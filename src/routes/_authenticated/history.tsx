import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { AppShell, MatchBadge, ProductTile } from "@/components/app-shell";
import { goals, matchProduct, productById } from "@/lib/nutrimatch";
import { useNutriMatch } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Scan history — NutriMatch" },
      {
        name: "description",
        content: "Every product you've scanned, when you scanned it, and how it matched your goal.",
      },
      { property: "og:title", content: "Scan history — NutriMatch" },
      {
        property: "og:description",
        content: "Reopen any previous scan to read the result again.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function HistoryPage() {
  const { history, profile, ready, clearHistory } = useNutriMatch();

  const rows = history
    .map((entry) => ({ entry, product: productById(entry.productId) }))
    .filter((row) => row.product);

  return (
    <AppShell
      title="Scan history"
      subtitle="Open any scan to read the result again."
      action={
        rows.length > 0 ? (
          <button
            onClick={clearHistory}
            className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold transition-colors hover:bg-surface"
          >
            Clear
          </button>
        ) : undefined
      }
    >
      {!ready ? null : rows.length === 0 ? (
        <p className="card-soft p-5 text-sm text-muted-foreground">
          Nothing here yet.{" "}
          <Link to="/scan" className="font-medium text-primary">
            Scan your first product
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map(({ entry, product }) => {
            const match = matchProduct(product!, profile.goal);
            const scannedGoal = goals.find((g) => g.id === entry.goal);
            return (
              <li key={`${entry.productId}-${entry.scannedAt}`}>
                <Link
                  to="/product/$productId"
                  params={{ productId: product!.id }}
                  className="card-soft flex items-center gap-4 p-4 transition-shadow hover:shadow-lift"
                >
                  <ProductTile emoji={product!.emoji} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{product!.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {formatDate(entry.scannedAt)}
                      {scannedGoal ? ` · scanned for ${scannedGoal.label.toLowerCase()}` : ""}
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
