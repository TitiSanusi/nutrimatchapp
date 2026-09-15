import { Link } from "@tanstack/react-router";
import { ChevronRight, ImageOff, Sparkles } from "lucide-react";
import type { AlternativesOutcome } from "@/lib/recommend/types";

/**
 * "Better matches for your goals".
 *
 * Presentation only: every score and verdict shown here comes from the shared
 * scoring engine and the recommendation comparison model. One, two or three
 * alternatives are all valid results — three is a maximum, not a target.
 */
export function BetterMatches({
  outcome,
  loading,
}: {
  outcome: AlternativesOutcome | undefined;
  loading: boolean;
}) {
  return (
    <section className="card-soft mt-4 p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-surface ring-1 ring-border">
          <Sparkles className="size-4 text-strong" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-sm font-semibold">Better matches for your goals</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Similar products that may better fit the goals you selected.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 space-y-2.5" aria-live="polite">
          <div className="h-20 animate-pulse rounded-xl bg-surface" />
          <div className="h-20 animate-pulse rounded-xl bg-surface" />
        </div>
      ) : outcome && outcome.status === "ok" && outcome.alternatives.length ? (
        <ul className="mt-4 space-y-2.5">
          {outcome.alternatives.map((alt) => (
            <li key={alt.barcode}>
              <Link
                to="/product/$barcode"
                params={{ barcode: alt.barcode }}
                className="flex items-start gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-surface sm:p-4"
              >
                {alt.imageUrl ? (
                  <img
                    src={alt.imageUrl}
                    alt={alt.name ? `${alt.name} packaging` : "Product packaging"}
                    loading="lazy"
                    className="size-12 shrink-0 rounded-xl bg-surface object-contain ring-1 ring-border"
                  />
                ) : (
                  <div
                    aria-hidden
                    className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface ring-1 ring-border"
                  >
                    <ImageOff className="size-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
                    <h3 className="font-display min-w-0 text-sm font-semibold">
                      {alt.name ?? "Name unavailable"}
                    </h3>
                    <p className="text-sm font-medium tabular-nums sm:text-right">
                      {alt.score === null ? "Limited data" : `${alt.score}/100 · ${alt.label}`}
                    </p>
                  </div>
                  {alt.brand ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{alt.brand}</p>
                  ) : null}
                  {alt.strongestGoal ? (
                    <p className="mt-1.5 text-xs font-medium text-strong">
                      Better for: {alt.strongestGoal}
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{alt.why}</p>
                  {alt.outOfMarket ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      May not be available in your market.
                    </p>
                  ) : null}
                </div>
                <ChevronRight aria-hidden className="mt-3 size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl bg-surface p-3.5 text-sm leading-relaxed text-muted-foreground sm:p-4">
          We couldn't find a comparable product with enough reliable data yet.
        </p>
      )}

      {outcome && outcome.status === "ok" && outcome.alternatives.length ? (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Compared within the same product category
          {outcome.meta.widened ? " (widened one level to find enough comparable products)" : ""}
          {outcome.meta.marketRestricted ? " and your market" : ""}. Each alternative is scored by the
          same NutriMatch engine against the goals you selected.
        </p>
      ) : null}
    </section>
  );
}
