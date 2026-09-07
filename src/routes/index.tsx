import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import avatar from "@/assets/avatar.jpg";
import {
  alternativesFor,
  goals,
  products,
  readProduct,
  type GoalId,
  type Tone,
} from "@/lib/scan-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nutrospace — See how a packaged food fits your goal" },
      {
        name: "description",
        content:
          "Scan a packaged food and get plain-language guidance for your own nutrition goal, with the factors behind every reading explained.",
      },
      { property: "og:title", content: "Nutrospace — Personalized food label readings" },
      {
        property: "og:description",
        content:
          "Guidance, not a verdict: see which nutrition factors drive a product's fit with your goal, and what to do about it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const toneDot: Record<Tone, string> = {
  supportive: "bg-supportive",
  caution: "bg-caution",
  info: "bg-info",
};

const toneText: Record<Tone, string> = {
  supportive: "text-supportive",
  caution: "text-caution",
  info: "text-info",
};

function Index() {
  const [goalId, setGoalId] = useState<GoalId>("balanced");
  const [productIndex, setProductIndex] = useState(0);
  const [nudgeTaken, setNudgeTaken] = useState(false);

  const product = products[productIndex]!;
  const goal = goals.find((g) => g.id === goalId)!;
  const reading = useMemo(() => readProduct(product, goalId), [product, goalId]);
  const alternatives = useMemo(() => alternativesFor(product, goalId), [product, goalId]);

  const scanNext = () => {
    setProductIndex((i) => (i + 1) % products.length);
    setNudgeTaken(false);
  };

  return (
    <div className="min-h-screen w-full overflow-hidden text-foreground">
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-brand/25 blur-[130px]" />
        <div className="absolute -right-32 -bottom-52 h-[560px] w-[560px] rounded-full bg-accent/25 blur-[140px]" />
        <div className="absolute top-1/3 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-info/12 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 py-8">
        <header className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-foreground/10 ring-1 ring-border">
              <span className="font-display text-lg font-bold text-brand">N</span>
            </div>
            <div>
              <p className="font-display text-[15px] font-semibold tracking-tight">Nutrospace</p>
              <p className="text-[11px] text-muted-foreground">Your scan, your story</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full bg-glass px-3 py-1.5 ring-1 ring-border sm:flex">
              <span className="size-1.5 rounded-full bg-supportive" />
              <span className="font-display text-xs text-muted-foreground">
                Goal · {goal.label}
              </span>
            </div>
            <img
              src={avatar}
              alt="Your profile"
              width={512}
              height={512}
              loading="lazy"
              className="size-9 rounded-full object-cover ring-1 ring-border"
            />
          </div>
        </header>

        <main className="mt-7 grid gap-4 md:grid-cols-12">
          <section className="bento p-6 md:col-span-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-brand">Live scan</p>
                <h1 className="font-display mt-2 text-3xl leading-tight font-semibold tracking-tight">
                  {product.name}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {product.brand} · {product.calories} kcal · {product.serving}
                </p>
              </div>
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-foreground/10 ring-1 ring-border">
                <span className="text-2xl">{product.emoji}</span>
              </div>
            </div>

            <div
              className={`mt-5 rounded-2xl p-4 ring-1 ${
                reading.fit >= 70
                  ? "bg-supportive/10 ring-supportive/25"
                  : reading.fit >= 50
                    ? "bg-info/10 ring-info/25"
                    : "bg-caution/10 ring-caution/25"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`font-display text-sm font-medium ${
                    reading.fit >= 70
                      ? "text-supportive"
                      : reading.fit >= 50
                        ? "text-info"
                        : "text-caution"
                  }`}
                >
                  {reading.headline}
                </span>
                <span className="rounded-full bg-foreground/10 px-2.5 py-1 text-xs font-semibold tabular-nums">
                  {reading.fit}% match
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {reading.summary}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: "Protein", value: `${product.protein}g` },
                { label: "Fiber", value: `${product.fiber}g` },
                { label: "Sugar", value: `${product.sugar}g` },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-glass p-3 ring-1 ring-border">
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                  <p className="font-display mt-1 text-xl font-semibold tabular-nums">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="bento p-6 md:col-span-5">
            <p className="eyebrow text-accent">Goal fit</p>
            <div className="mt-4 flex items-center gap-5">
              <div className="relative grid size-28 shrink-0 place-items-center">
                <div
                  className="size-full rounded-full"
                  style={{
                    background: `conic-gradient(var(--accent) 0 ${reading.fit}%, oklch(1 0 0 / 8%) ${reading.fit}% 100%)`,
                  }}
                />
                <div className="absolute inset-[10px] grid place-items-center rounded-full bg-card">
                  <span className="font-display text-2xl font-bold tabular-nums">
                    {reading.fit}%
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {goal.label} · {goal.cadence}
                </p>
                <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                  {reading.factors.slice(0, 3).map((f) => (
                    <div key={f.key} className="flex items-center gap-2">
                      <span className={`size-2 rounded-full ${toneDot[f.tone]}`} />
                      {f.label} · {f.value}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-glass p-3.5 ring-1 ring-border">
              <p className="text-xs text-muted-foreground">Reading this for a different goal</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {goals.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setGoalId(g.id)}
                    aria-pressed={g.id === goalId}
                    className={`font-display rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      g.id === goalId
                        ? "bg-accent text-accent-foreground"
                        : "bg-foreground/5 text-muted-foreground ring-1 ring-border hover:text-foreground"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="bento p-6 md:col-span-4">
            <p className="eyebrow text-muted-foreground">Why we say this</p>
            <ul className="mt-4 space-y-3">
              {reading.factors.slice(0, 4).map((f) => (
                <li key={f.key} className="flex gap-3">
                  <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${toneDot[f.tone]}`} />
                  <span className="text-sm text-muted-foreground">
                    <span className="text-foreground">
                      {f.label} {f.value}
                    </span>{" "}
                    — {f.reason}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              {product.ingredientNote}
            </p>
          </section>

          <section className="bento p-6 md:col-span-4">
            <p className="eyebrow text-muted-foreground">Gentle nudge</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{reading.nudge}</p>
            <button
              onClick={() => setNudgeTaken((v) => !v)}
              className="font-display mt-4 w-full rounded-xl bg-brand/90 py-2.5 text-sm font-semibold text-brand-foreground transition hover:bg-brand"
            >
              {nudgeTaken ? "Saved to your day" : "Apply suggestion"}
            </button>
          </section>

          <section className="bento p-6 md:col-span-4">
            <p className="eyebrow text-muted-foreground">Compare alternative</p>
            <div className="mt-4 space-y-3">
              {alternatives.map(({ product: alt, reading: altReading }) => (
                <button
                  key={alt.id}
                  onClick={() => {
                    setProductIndex(products.findIndex((p) => p.id === alt.id));
                    setNudgeTaken(false);
                  }}
                  className="w-full rounded-2xl bg-glass p-3 text-left ring-1 ring-border transition hover:bg-foreground/10"
                >
                  <div className="flex justify-between gap-3">
                    <span className="text-sm">{alt.name}</span>
                    <span
                      className={`text-xs tabular-nums ${toneText[altReading.factors[0]!.tone]}`}
                    >
                      {altReading.fit}%
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {altReading.factors[0]!.label} {altReading.factors[0]!.value} ·{" "}
                    {alt.fiber}g fiber
                  </p>
                </button>
              ))}
            </div>
          </section>
        </main>

        <footer className="mt-6 flex items-center justify-between gap-4 px-1 text-xs text-muted-foreground">
          <span>Nutrospace · Guidance, not a verdict</span>
          <button onClick={scanNext} className="font-display text-foreground hover:text-brand">
            Scan another item
          </button>
        </footer>
      </div>
    </div>
  );
}
