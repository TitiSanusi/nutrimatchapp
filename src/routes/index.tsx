import { createFileRoute, Link } from "@tanstack/react-router";
import { ScanLine, Sparkles, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NutriMatch — Scan. Understand. Choose better." },
      {
        name: "description",
        content:
          "Scan a packaged food and see how it fits your personal nutrition goal, with a plain-language explanation of why.",
      },
      { property: "og:title", content: "NutriMatch — Know your food, make better choices" },
      {
        property: "og:description",
        content:
          "NutriMatch explains how a packaged food matches your nutrition goal — no good-or-bad labels.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-14">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <ScanLine className="size-4.5" aria-hidden />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">NutriMatch</span>
        </div>

        <p className="eyebrow mt-10 text-primary">Scan. Understand. Choose better.</p>
        <h1 className="font-display mt-3 text-4xl leading-[1.1] font-semibold tracking-tight">
          Know your food.
          <br />
          Make better choices.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          Scan a packaged food and see how it fits your personal nutrition goal.
        </p>

        <div className="mt-8 space-y-3">
          <Link
            to="/onboarding"
            className="font-display block w-full rounded-2xl bg-primary py-4 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get Started
          </Link>
          <Link
            to="/signin"
            className="font-display block w-full rounded-2xl border border-border bg-card py-4 text-center text-sm font-semibold transition-colors hover:bg-surface"
          >
            Sign In
          </Link>
        </div>

        <ul className="mt-10 space-y-4">
          {[
            {
              icon: Sparkles,
              title: "Personal, not generic",
              body: "Every reading is based on the goal you choose.",
            },
            {
              icon: ShieldCheck,
              title: "Always explained",
              body: "You see the factors behind each result — never just a score.",
            },
          ].map((item) => (
            <li key={item.title} className="flex gap-3">
              <item.icon className="mt-0.5 size-4.5 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
