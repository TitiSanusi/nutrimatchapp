import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowLeft, ImageOff, PackageSearch, RefreshCw, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { lookupProduct } from "@/lib/food.functions";
import { nutrientLabels, nutrientOrder, type FoodProduct, type NutrientKey } from "@/lib/food/types";
import { goalById, goalNutrients } from "@/lib/nutrimatch";
import { useNutriMatch } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/product/$barcode")({
  head: () => ({
    meta: [
      { title: "Product details — NutriMatch" },
      {
        name: "description",
        content:
          "The label information for the packaged food you scanned: ingredients, nutrition facts, allergens and serving size.",
      },
      { property: "og:title", content: "Product details — NutriMatch" },
      {
        property: "og:description",
        content: "Everything on the label, in one clear place.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductResult,
});

const UNAVAILABLE = "Unavailable";

function ProductResult() {
  const { barcode } = Route.useParams();
  const lookup = useServerFn(lookupProduct);

  const query = useQuery({
    queryKey: ["product", barcode],
    queryFn: () => lookup({ data: { barcode } }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return (
    <AppShell>
      <Link
        to="/home"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Home
      </Link>

      {query.isPending ? (
        <LoadingSkeleton />
      ) : query.isError || query.data?.status === "unavailable" ? (
        <Unavailable onRetry={() => query.refetch()} />
      ) : query.data?.status === "not_found" ? (
        <NotFound barcode={barcode} />
      ) : query.data ? (
        <Found product={query.data.product} />
      ) : null}
    </AppShell>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mt-4 space-y-4" aria-busy="true" aria-label="Loading product">
      <div className="card-soft p-6">
        <div className="flex items-start gap-4">
          <div className="size-16 animate-pulse rounded-2xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
      <div className="card-soft space-y-3 p-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}

function Unavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="card-soft mt-4 p-6">
      <AlertTriangle className="size-6 text-moderate" aria-hidden />
      <h1 className="font-display mt-3 text-lg font-semibold tracking-tight">
        We couldn't load this product
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        The product service didn't respond just now, or your connection dropped. Nothing is wrong
        with the pack you scanned.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={onRetry}
          className="font-display inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <RefreshCw className="size-4" aria-hidden />
          Try again
        </button>
        <Link
          to="/search"
          className="font-display inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-sm font-semibold transition-colors hover:bg-surface"
        >
          <Search className="size-4" aria-hidden />
          Search manually
        </Link>
      </div>
    </section>
  );
}

function NotFound({ barcode }: { barcode: string }) {
  return (
    <section className="card-soft mt-4 p-6">
      <PackageSearch className="size-6 text-primary" aria-hidden />
      <h1 className="font-display mt-3 text-lg font-semibold tracking-tight">
        We couldn't find this product yet. Help us add it.
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Barcode <span className="tabular-nums">{barcode}</span> isn't in the food database yet. Send
        us a few photos of the pack and we'll add it.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link
          to="/contribute/$barcode"
          params={{ barcode }}
          className="font-display inline-flex flex-1 items-center justify-center rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Help us add this product
        </Link>
        <Link
          to="/search"
          className="font-display inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-sm font-semibold transition-colors hover:bg-surface"
        >
          <Search className="size-4" aria-hidden />
          Search manually
        </Link>
      </div>
    </section>
  );
}

const format = (key: NutrientKey, value: number | null | undefined) =>
  value === null || value === undefined ? UNAVAILABLE : `${value} ${nutrientLabels[key].unit}`;

function Found({ product }: { product: FoodProduct }) {
  const { profile, recordScan } = useNutriMatch();
  const navigate = useNavigate();

  useEffect(() => {
    recordScan({
      barcode: product.barcode,
      name: product.name,
      brand: product.brand,
      imageUrl: product.imageUrl,
    });
    // Record once per product opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.barcode]);

  const per100 = product.nutrition.per100g;
  const perServing = product.nutrition.perServing;
  const hasServingColumn = nutrientOrder.some(
    (k) => perServing[k] !== null && perServing[k] !== undefined,
  );

  const myGoals = profile.goals.length ? profile.goals : [profile.goal];

  return (
    <>
      <section className="card-soft mt-4 p-6">
        <div className="flex items-start gap-4">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name ? `${product.name} packaging` : "Product packaging"}
              loading="lazy"
              className="size-20 shrink-0 rounded-2xl bg-surface object-contain ring-1 ring-border"
            />
          ) : (
            <div
              aria-hidden
              className="grid size-20 shrink-0 place-items-center rounded-2xl bg-surface ring-1 ring-border"
            >
              <ImageOff className="size-6 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-display text-xl leading-snug font-semibold tracking-tight">
              {product.name ?? "Name unavailable"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{product.brand ?? UNAVAILABLE}</p>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              Barcode {product.barcode}
            </p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 rounded-2xl bg-surface p-4 text-sm">
          <Field label="Serving size" value={product.servingSize} />
          <Field label="Pack size" value={product.quantity} />
          <Field label="Category" value={product.categories[0] ?? null} />
          <Field label="Sold in" value={product.countries.slice(0, 3).join(", ") || null} />
        </dl>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Label data from {product.origin.providerLabel}. Fields the source doesn't have are shown as
          unavailable — we never estimate them.
        </p>
      </section>

      <section className="card-soft mt-4 p-6">
        <h2 className="font-display text-sm font-semibold">Nutrition facts</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Nutrient</th>
                <th className="pb-2 text-right font-medium">Per 100 g/ml</th>
                {hasServingColumn && <th className="pb-2 text-right font-medium">Per serving</th>}
              </tr>
            </thead>
            <tbody>
              {nutrientOrder.map((key) => (
                <tr key={key} className="border-t border-border">
                  <td className="py-2.5">{nutrientLabels[key].label}</td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                    {format(key, per100[key])}
                  </td>
                  {hasServingColumn && (
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                      {format(key, perServing[key])}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card-soft mt-4 p-6">
        <h2 className="font-display text-sm font-semibold">Ingredients</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {product.ingredientsText ?? UNAVAILABLE}
        </p>
        <h3 className="font-display mt-5 text-sm font-semibold">Allergens</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {product.allergens.length ? product.allergens.join(", ") : UNAVAILABLE}
        </p>
        {product.extras.length > 0 && (
          <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            {product.extras.map((extra) => (
              <div key={extra.label} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{extra.label}</dt>
                <dd className="text-right">{extra.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="card-soft mt-4 p-6">
        <p className="eyebrow text-primary">Your goals</p>
        <h2 className="font-display mt-2 text-sm font-semibold">
          The numbers that matter for you
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Personalized guidance is coming next. For now, here's what this label says about the
          nutrients tied to your goals.
        </p>
        <ul className="mt-4 space-y-4">
          {myGoals.map((goalId) => {
            const goal = goalById(goalId);
            if (!goal) return null;
            return (
              <li key={goalId}>
                <p className="text-sm font-semibold">{goal.label}</p>
                <ul className="mt-1.5 space-y-1">
                  {goalNutrients[goalId].map((key) => (
                    <li
                      key={key}
                      className="flex justify-between gap-4 text-sm text-muted-foreground"
                    >
                      <span>{nutrientLabels[key].label} (per 100 g/ml)</span>
                      <span className="tabular-nums">{format(key, per100[key])}</span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={() => void navigate({ to: "/scan" })}
          className="font-display flex-1 rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Scan another product
        </button>
        <Link
          to="/search"
          className="font-display flex-1 rounded-2xl border border-border bg-card py-4 text-center text-sm font-semibold transition-colors hover:bg-surface"
        >
          Search for a product
        </Link>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate font-medium">{value ?? UNAVAILABLE}</dd>
    </div>
  );
}
