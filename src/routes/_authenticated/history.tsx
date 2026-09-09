import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, ImageOff, ScanLine } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { goalById } from "@/lib/nutrimatch";
import { useNutriMatch } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Scan history — NutriMatch" },
      {
        name: "description",
        content: "Every packaged food you've looked up, newest first, ready to open again.",
      },
      { property: "og:title", content: "Scan history — NutriMatch" },
      {
        property: "og:description",
        content: "Come back to any product you've scanned before.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { history, clearHistory, ready } = useNutriMatch();

  return (
    <AppShell
      title="History"
      subtitle="Products you've looked up."
      action={
        history.length > 0 ? (
          <button
            onClick={clearHistory}
            className="font-display rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold transition-colors hover:bg-surface"
          >
            Clear
          </button>
        ) : undefined
      }
    >
      {!ready ? null : history.length === 0 ? (
        <section className="card-soft p-6">
          <ScanLine className="size-6 text-primary" aria-hidden />
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing here yet. Scan a pack and it will show up in your history.
          </p>
          <Link
            to="/scan"
            className="font-display mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ScanLine className="size-4.5" aria-hidden />
            Scan a product
          </Link>
        </section>
      ) : (
        <ul className="space-y-2.5">
          {history.map((entry) => (
            <li key={`${entry.barcode}-${entry.scannedAt}`}>
              <Link
                to="/product/$barcode"
                params={{ barcode: entry.barcode }}
                className="card-soft flex items-center gap-4 p-4 transition-shadow hover:shadow-lift"
              >
                {entry.imageUrl ? (
                  <img
                    src={entry.imageUrl}
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
                    {entry.name ?? `Barcode ${entry.barcode}`}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {entry.brand ?? "Brand unavailable"}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {new Date(entry.scannedAt).toLocaleDateString()} ·{" "}
                    {goalById(entry.goal)?.label ?? "Your goal"}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
