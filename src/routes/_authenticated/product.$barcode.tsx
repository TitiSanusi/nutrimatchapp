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
  Target,
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
import { goalNutrients } from "@/lib/nutrimatch";
import {
  analyzeProductFit,
  halfPortion,
  type GoalEvidence,
  type NutrientEvidence,
} from "@/lib/product-fit";
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
  const hasLimitedGoalData = analysis.relevantAvailableCount < analysis.relevantExpectedCount;


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
          Label data from {product.origin.providerLabel}. Fields the source doesn't have are shown
          as unavailable — we never estimate them.
        </p>
      </section>

      <FitSection fit={fit} product={product} />



      <section className="card-soft mt-4 p-6">
        <p className="eyebrow text-primary">How it fits your goals</p>
        <h2 className="font-display mt-2 text-lg font-semibold">A separate view for every goal</h2>
        <div className="mt-5 space-y-4">
          {analysis.goals.map((goal) => (
            <GoalEvidenceCard key={goal.goalId} goal={goal} />
          ))}
        </div>
        {analysis.goals.length > 1 && analysis.keyFacts.length > 1 && (
          <div className="mt-5 border-t border-border pt-5">
            <h3 className="font-display text-sm font-semibold">Your goal trade-offs</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Your goals bring different parts of the same label into focus. On the bases shown
              below, this product provides {formatEvidenceList(analysis.keyFacts)}. NutriMatch is
              showing these together without deciding which goal should outweigh another.
            </p>
          </div>
        )}
      </section>

      <section className="card-soft mt-4 p-6">
        <p className="eyebrow text-primary">Why these details</p>
        <h2 className="font-display mt-2 text-lg font-semibold">Goal-relevant label facts</h2>
        {analysis.keyFacts.length ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {analysis.keyFacts.map((fact) => (
              <li key={fact.key} className="rounded-xl bg-surface p-4">
                <p className="text-xs text-muted-foreground">{fact.label}</p>
                <p className="font-display mt-1 text-lg font-semibold tabular-nums">
                  {fact.value} {fact.unit}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {fact.basis === "perServing" ? "Per serving" : "Per 100 g/ml"}
                  {fact.derived ? " · calculated from serving size" : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            This product does not include the nutrition fields needed to explain your selected
            goals.
          </p>
        )}
        {hasLimitedGoalData && (
          <div className="mt-4 flex gap-3 rounded-xl bg-gentle-soft p-4">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gentle" aria-hidden />
            <p className="text-sm leading-relaxed">
              <span className="font-semibold">Limited nutrition data.</span> We can show{" "}
              {analysis.relevantAvailableCount} of {analysis.relevantExpectedCount} relevant label
              details, so we can’t fully evaluate this product yet.
            </p>
          </div>
        )}
      </section>

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

      <section className="card-soft mt-4 p-6">
        <p className="eyebrow text-primary">Want a better fit?</p>
        <h2 className="font-display mt-2 text-lg font-semibold">Compare like with like</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          When comparing similar products, use the same basis — per serving or per 100 g/ml — and
          compare the label fields tied to your goals: {comparisonLabels(myGoals)}. A future
          approved method will determine how those differences affect the fit category.
        </p>
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

function formatEvidence(fact: NutrientEvidence) {
  return `${fact.value} ${fact.unit} ${fact.label.toLowerCase()}`;
}

function formatEvidenceList(facts: NutrientEvidence[]) {
  const formatted = facts.map(formatEvidence);
  if (formatted.length < 2) return formatted[0] ?? "no relevant listed nutrients";
  return `${formatted.slice(0, -1).join(", ")} and ${formatted.at(-1)}`;
}

function GoalEvidenceCard({ goal }: { goal: GoalEvidence }) {
  return (
    <article className="rounded-xl border border-border p-4">
      <div className="flex items-center gap-2">
        <Target className="size-4 text-primary" aria-hidden />
        <h3 className="font-display text-sm font-semibold">{goal.goalLabel}</h3>
      </div>
      {goal.available.length ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            For this goal, the label reports {formatEvidenceList(goal.available)}.
          </p>
          <ul className="mt-3 space-y-2">
            {goal.available.map((fact) => (
              <li key={fact.key} className="flex items-center justify-between gap-4 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className="size-1.5 shrink-0 rounded-full bg-muted-foreground/50"
                    aria-hidden
                  />
                  {fact.label}
                </span>
                <span className="font-medium tabular-nums">
                  {fact.value} {fact.unit}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {fact.basis === "perServing" ? "/ serving" : "/ 100 g/ml"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The relevant nutrition fields for this goal are not listed, so NutriMatch won’t infer
          them.
        </p>
      )}
      {goal.missing.length > 0 && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Not available: {goal.missing.map((key) => nutrientLabels[key].label).join(", ")}.
        </p>
      )}
    </article>
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

function comparisonLabels(goalIds: Parameters<typeof analyzeProductFit>[1]) {
  const labels = [...new Set(goalIds.flatMap((id) => goalNutrients[id]))].map((key) =>
    nutrientLabels[key].label.toLowerCase(),
  );
  if (labels.length < 2) return labels[0] ?? "the available nutrients";
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate font-medium">{value ?? UNAVAILABLE}</dd>
    </div>
  );
}
