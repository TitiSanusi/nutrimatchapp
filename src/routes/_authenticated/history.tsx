import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, ImageOff, ScanLine } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { clearScanHistory, listScanHistory } from "@/lib/history.functions";
import { useNutriMatch } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Scan history — NutriMatch" },
      {
        name: "description",
        content: "Every packaged food you've scanned, newest first, ready to open again.",
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

/** "12 Sept 2026 · 14:05" — kept short so it fits a mobile row. */
export function formatScannedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} · ${date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}

function HistoryPage() {
  const { session, ready } = useNutriMatch();
  const queryClient = useQueryClient();
  const fetchHistory = useServerFn(listScanHistory);
  const clear = useServerFn(clearScanHistory);

  const history = useQuery({
    queryKey: ["scan-history", session?.user.id ?? null],
    queryFn: () => fetchHistory(),
    enabled: ready && !!session,
  });

  const clearAll = useMutation({
    mutationFn: () => clear(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scan-history"] }),
  });

  const items = history.data ?? [];

  return (
    <AppShell
      title="History"
      subtitle="Products you've scanned."
      action={
        items.length > 0 ? (
          <button
            onClick={() => clearAll.mutate()}
            disabled={clearAll.isPending}
            className="font-display rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold transition-colors hover:bg-surface disabled:opacity-60"
          >
            Clear
          </button>
        ) : undefined
      }
    >
      {history.isPending ? null : items.length === 0 ? (
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
          {items.map((entry) => (
            <li key={entry.barcode}>
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
                  {entry.brand ? (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {entry.brand}
                    </span>
                  ) : null}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Scanned {formatScannedAt(entry.lastScannedAt)}
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
