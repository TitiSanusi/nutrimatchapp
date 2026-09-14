import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowLeft,
  
  ImageOff,
  Info,
  PackageSearch,
  RefreshCw,
  Scale,
  Search,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { lookupProduct } from "@/lib/food.functions";
import { hasAddedSugarIngredient } from "@/lib/food/added-sugars";
import {
  nutrientLabels,
  nutrientOrder,
  type FoodProduct,
  type NutrientKey,
} from "@/lib/food/types";
import { analyzeProductFit, halfPortion } from "@/lib/product-fit";
import { scoreProductFit, statusText, type GoalScore, type ProductScore } from "@/lib/scoring";
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
  const analysis = analyzeProductFit(product, myGoals);
  const fit = scoreProductFit(product, myGoals);

  return (
    <>
      <section className="card-soft mt-3 p-4 sm:mt-4 sm:p-6">
        <div className="flex items-start gap-4">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name ? `${product.name} packaging` : "Product packaging"}
              loading="lazy"
              className="size-16 shrink-0 rounded-2xl bg-surface object-contain ring-1 ring-border sm:size-20"
            />
          ) : (
            <div
              aria-hidden
              className="grid size-16 shrink-0 place-items-center rounded-2xl bg-surface ring-1 ring-border sm:size-20"
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

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-surface p-3 text-sm sm:mt-5 sm:gap-4 sm:p-4">
          <Field label="Serving size" value={product.servingSize} />
          <Field label="Pack size" value={product.quantity} />
          <Field label="Category" value={product.categories[0] ?? null} />
          <Field label="Sold in" value={product.countries.slice(0, 3).join(", ") || null} />
        </dl>

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground sm:mt-4">
          Label data from {product.origin.providerLabel}. Fields the source doesn't have are shown
          as unavailable — we never estimate them.
        </p>
      </section>

      <FitSection fit={fit} product={product} />

      <PortionComparison analysis={analysis} servingSize={product.servingSize} />

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
        {per100.addedSugars === null &&
          perServing.addedSugars === null &&
          hasAddedSugarIngredient(product.ingredientsText) && (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              The ingredient list contains added-sugar ingredients, but a reliable added-sugar
              amount is not available.
            </p>
          )}
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

function FitSection({ fit, product }: { fit: ProductScore; product: FoodProduct }) {
  const scored = fit.score !== null;
  return (
    <section className="card-soft mt-4 overflow-hidden">
      <div className="bg-strong-soft p-4 sm:p-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:justify-between sm:gap-5">
          <div className="min-w-0">
            <p className="eyebrow text-strong">NutriMatch fit</p>
            <h2 className="font-display mt-2 text-xl font-semibold">
              {scored ? `${fit.label} fit for your goals` : "Limited data"}
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
              {scored
                ? `Based on ${fit.scoredGoalCount} of your ${fit.consideredGoalCount} selected goal${
                    fit.consideredGoalCount === 1 ? "" : "s"
                  }. This shows how well the product matches the goals you chose — not whether a food is healthy or unhealthy.`
                : "None of your selected goals can be evaluated from this product's available label data. Missing information is never counted as zero."}
            </p>
          </div>
          <div className="shrink-0 rounded-xl border border-strong/20 bg-card px-3 py-2 text-center">
            <span className="font-display block text-xl font-semibold tabular-nums">
              {scored ? fit.score : "—"}
            </span>
            <span className="block text-[10px] font-semibold text-muted-foreground">/ 100</span>
          </div>
        </div>
      </div>

      <div className="space-y-2.5 border-t border-border p-4 sm:space-y-3 sm:p-6">
        {fit.goals.map((goal) => (
          <GoalScoreCard key={goal.goalId} goal={goal} />
        ))}
        {fit.unscoredGoals.map((goal) => (
          <article key={goal.goalId} className="rounded-xl border border-border p-3.5 sm:p-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2">
              <h3 className="font-display min-w-0 text-sm font-semibold">{goal.goalLabel}</h3>
              <p className="text-right text-sm font-medium text-muted-foreground">Limited data</p>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              NutriMatch does not score this selected goal in V1.
            </p>
          </article>
        ))}
      </div>

      <details className="border-t border-border">
        <summary className="cursor-pointer p-4 text-sm font-semibold sm:p-6">
          How NutriMatch calculated this
        </summary>
        <div className="space-y-3 px-4 pb-4 text-sm leading-relaxed text-muted-foreground sm:px-6 sm:pb-6">
          <p>
            NutriMatch looked at{" "}
            {fit.goals.length ? fit.goals.map((g) => g.goalLabel.toLowerCase()).join(", ") : "no"}{" "}
            selected goal
            {fit.goals.length === 1 ? "" : "s"} and used{" "}
            {fit.servingReliable
              ? "this product's stated serving size"
              : "standardized per 100 g/ml values, because no reliable serving size is stated"}
            . For energy, {fit.category.reason}.
          </p>
          {fit.goals.map((goal) => (
            <div key={goal.goalId}>
              <p className="font-medium text-foreground">{goal.goalLabel}</p>
              <p>
                {goal.score === null
                  ? `${statusText[goal.status]} — left out of the fit number.`
                  : `${goal.score}/100 · ${goal.label}.`}{" "}
                {goal.used.length ? `Values used: ${goal.used.join("; ")}.` : "No values available."}
              </p>
            </div>
          ))}
          {fit.unscoredGoals.map((goal) => (
            <div key={goal.goalId}>
              <p className="font-medium text-foreground">{goal.goalLabel}</p>
              <p>Not scored in V1 and left out of the fit number.</p>
            </div>
          ))}
          <p>
            Values the source doesn't state are shown as unavailable — they are never estimated, and
            no serving size is invented. Label data from {product.origin.providerLabel}.
          </p>
        </div>
      </details>
    </section>
  );
}

function GoalScoreCard({ goal }: { goal: GoalScore }) {
  return (
    <article className="rounded-xl border border-border p-3.5 sm:p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2">
        <h3 className="font-display min-w-0 text-sm font-semibold">{goal.goalLabel}</h3>
        <p className="text-right text-sm font-medium tabular-nums">
          {goal.score === null ? (
            <span className="text-muted-foreground">{compactStatus(goal)}</span>
          ) : (
            <>
              {goal.score}/100 · {goal.label}
            </>
          )}
        </p>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {consumerExplanation(goal)}
      </p>
    </article>
  );
}

function compactStatus(goal: GoalScore) {
  if (goal.status === "works_against_uncertain") {
    return "Works against goal · quantity uncertain";
  }
  if (goal.status === "no_contribution") return "Doesn't contribute";
  return statusText[goal.status];
}

function consumerExplanation(goal: GoalScore) {
  if (goal.goalId === "less-sugar" && goal.status === "works_against_uncertain") {
    const totalSugar = goal.used.find((value) => value.startsWith("Total sugars "));
    const context = totalSugar
      ? `${totalSugar.replace("Total sugars ", "").replace(" perServing", " per serving")}. `
      : "";
    return `${context}Added-sugar ingredients are present, but the exact added-sugar amount is unavailable.`;
  }

  if (goal.goalId === "more-fibre" && goal.status === "no_contribution") {
    const fibre = goal.used.find((value) => value.startsWith("Fibre "));
    return fibre
      ? `${fibre.replace("Fibre ", "").replace("per 100 g/ml", "fibre per 100 g/ml").replace("per serving", "fibre per serving")}.`
      : "The label reports 0 g fibre.";
  }

  if (goal.goalId === "lose-weight" && goal.components) {
    const energy = goal.components.find((component) => component.label === "Energy context");
    const protein = goal.components.find((component) => component.label === "Protein density");
    const fibre = goal.components.find((component) => component.label === "Fibre density");
    const energyDetail = energy?.detail.split(" · ")[0];
    if (energyDetail && protein?.score === 0 && fibre?.score === 0) {
      return `${energyDetail} with no protein or fibre contribution.`;eit
    }
    if (energyDetail) return `Based on ${energyDetail}, protein density, and fibre density.`;
  }

  return goal.explanation.replace(
    " That is reported data, not missing data.",
    "",
  );
}

function PortionComparison({
  analysis,
  servingSize,
}: {
  analysis: ReturnType<typeof analyzeProductFit>;
  servingSize: string | null;
}) {
  const facts = analysis.keyFacts.filter((fact) => fact.basis === "perServing").slice(0, 3);
  if (!facts.length) {
    return (
      <section className="card-soft mt-4 p-6">
        <Scale className="size-5 text-primary" aria-hidden />
        <p className="eyebrow mt-3 text-primary">Still want it?</p>
        <h2 className="font-display mt-2 text-lg font-semibold">A portion comparison</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          We can’t calculate a portion comparison because this product does not provide enough
          serving information. NutriMatch won’t guess a serving size.
        </p>
      </section>
    );
  }

  const servingLabel = servingSize ?? "1 serving";
  const halfLabel =
    analysis.serving.amount && analysis.serving.unit
      ? `${analysis.serving.amount / 2} ${analysis.serving.unit}`
      : "½ serving";

  return (
    <section className="card-soft mt-4 p-6">
      <Scale className="size-5 text-primary" aria-hidden />
      <p className="eyebrow mt-3 text-primary">Still want it?</p>
      <h2 className="font-display mt-2 text-lg font-semibold">A portion comparison</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        A half portion contains half of each listed amount. This comparison is mathematical, not a
        recommendation or a promise of a health outcome.
      </p>
      <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-xl border border-border">
        <div className="border-r border-border bg-surface p-4">
          <p className="text-xs text-muted-foreground">Full serving</p>
          <p className="mt-1 text-sm font-semibold">{servingLabel}</p>
          <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            {facts.map((fact) => (
              <li key={fact.key}>
                {fact.value} {fact.unit} {fact.label.toLowerCase()}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4">
          <p className="text-xs text-muted-foreground">Half portion</p>
          <p className="mt-1 text-sm font-semibold">{halfLabel}</p>
          <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            {facts.map((fact) => (
              <li key={fact.key}>
                ≈ {halfPortion(fact.value)} {fact.unit} {fact.label.toLowerCase()}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
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
