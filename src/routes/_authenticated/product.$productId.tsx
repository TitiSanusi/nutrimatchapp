import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { AppShell, MatchBadge, ProductTile } from "@/components/app-shell";
import { betterMatches, goals, matchProduct, productById } from "@/lib/nutrimatch";
import { useNutriMatch } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/product/$productId")({
  head: ({ params }) => {
    const product = productById(params.productId);
    const title = product ? `${product.name} — NutriMatch` : "Product — NutriMatch";
    const description = product
      ? `How ${product.name} by ${product.brand} fits your nutrition goal, and the factors behind the result.`
      : "See how a packaged food fits your nutrition goal.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ProductResult,
});

function ProductResult() {
  const { productId } = Route.useParams();
  const { profile, recordScan } = useNutriMatch();
  const product = productById(productId);
  const [showAlternatives, setShowAlternatives] = useState(false);

  useEffect(() => {
    if (product) recordScan(product.id);
  }, [product, recordScan]);

  if (!product) {
    return (
      <AppShell title="Product not found">
        <p className="card-soft p-5 text-sm text-muted-foreground">
          We don't have this product yet.{" "}
          <Link to="/search" className="font-medium text-primary">
            Search for another
          </Link>
          .
        </p>
      </AppShell>
    );
  }

  const goal = goals.find((g) => g.id === profile.goal) ?? goals[0]!;
  const match = matchProduct(product, profile.goal);
  const alternatives = betterMatches(product, profile.goal);

  return (
    <AppShell>
      <Link
        to="/home"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Home
      </Link>

      <section className="card-soft mt-4 p-6">
        <div className="flex items-start gap-4">
          <ProductTile emoji={product.emoji} className="size-16 text-3xl" />
          <div className="min-w-0">
            <h1 className="font-display text-xl leading-snug font-semibold tracking-tight">
              {product.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {product.brand} · {product.serving}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-surface p-4">
          <p className="text-xs text-muted-foreground">Goal: {goal.label}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <MatchBadge level={match.level} label={match.label} />
            <span className="text-xs text-muted-foreground tabular-nums">
              {match.score}% aligned with your goal
            </span>
          </div>
          <div
            className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`${match.score} percent aligned with your goal`}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${match.score}%` }}
            />
          </div>
        </div>

        <div className="mt-5">
          <h2 className="font-display text-sm font-semibold">Why?</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{match.explanation}</p>
        </div>
      </section>

      <section className="card-soft mt-4 p-6">
        <h2 className="font-display text-sm font-semibold">What we looked at</h2>
        <ul className="mt-4 space-y-4">
          {match.factors.map((f) => (
            <li key={f.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold">{f.label}</span>
                <span className="text-sm text-muted-foreground tabular-nums">{f.value}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.reason}</p>
            </li>
          ))}
        </ul>
        <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
          Ingredients: {product.ingredients}
        </p>
      </section>

      <section className="mt-4">
        {!showAlternatives ? (
          <button
            onClick={() => setShowAlternatives(true)}
            className="font-display w-full rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            See Better Matches
          </button>
        ) : (
          <div>
            <h2 className="font-display px-1 text-sm font-semibold">Better matches</h2>
            <p className="mt-1 px-1 text-xs text-muted-foreground">{match.suggestion}</p>
            {alternatives.length === 0 ? (
              <p className="card-soft mt-3 p-5 text-sm text-muted-foreground">
                Nothing in our list fits your goal better than this one right now.
              </p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {alternatives.map(({ product: alt, match: altMatch }) => (
                  <li key={alt.id}>
                    <Link
                      to="/product/$productId"
                      params={{ productId: alt.id }}
                      className="card-soft flex items-start gap-4 p-4 transition-shadow hover:shadow-lift"
                    >
                      <ProductTile emoji={alt.emoji} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{alt.name}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {alt.calories} kcal · {alt.protein}g protein · {alt.fibre}g fibre ·{" "}
                          {alt.addedSugar}g added sugar · {alt.sodium}mg sodium
                        </span>
                        <MatchBadge level={altMatch.level} label={altMatch.label} className="mt-2" />
                        <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">
                          {altMatch.factors[0]!.reason}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </AppShell>
  );
}
