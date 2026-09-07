import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { countries, goals, type GoalId } from "@/lib/nutrimatch";
import { useNutriMatch } from "@/lib/store";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your goal — NutriMatch" },
      {
        name: "description",
        content:
          "Choose your country and your main nutrition goal so NutriMatch can read food labels the way that suits you.",
      },
      { property: "og:title", content: "Set up your goal — NutriMatch" },
      {
        property: "og:description",
        content: "Two quick steps: your country, then the nutrition goal you care about most.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const { profile, updateProfile } = useNutriMatch();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [country, setCountry] = useState(profile.country);
  const [goal, setGoal] = useState<GoalId>(profile.goal);

  const finish = () => {
    updateProfile({ country, goal, onboarded: true });
    navigate({ to: "/home" });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-10">
      <div className="flex gap-2" aria-hidden>
        {[0, 1].map((i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      {step === 0 ? (
        <div className="mt-9">
          <p className="eyebrow text-primary">Step 1 of 2</p>
          <h1 className="font-display mt-3 text-2xl font-semibold tracking-tight">
            Select your country
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Labels and reference amounts differ by region.
          </p>

          <div className="mt-6 space-y-2">
            {countries.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCountry(c)}
                aria-pressed={c === country}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-sm transition-colors ${
                  c === country
                    ? "border-primary bg-strong-soft font-semibold"
                    : "border-border bg-card hover:bg-surface"
                }`}
              >
                {c}
                {c === country && <Check className="size-4 text-primary" aria-hidden />}
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep(1)}
            className="font-display mt-7 w-full rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Continue
          </button>
        </div>
      ) : (
        <div className="mt-9">
          <p className="eyebrow text-primary">Step 2 of 2</p>
          <h1 className="font-display mt-3 text-2xl font-semibold tracking-tight">
            What is your main nutrition goal?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick one — you can change it any time in your profile.
          </p>

          <div className="mt-6 space-y-2">
            {goals.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGoal(g.id)}
                aria-pressed={g.id === goal}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                  g.id === goal
                    ? "border-primary bg-strong-soft"
                    : "border-border bg-card hover:bg-surface"
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{g.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    For {g.blurb}
                  </span>
                </span>
                {g.id === goal && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
              </button>
            ))}
          </div>

          <div className="mt-7 flex gap-3">
            <button
              onClick={() => setStep(0)}
              className="font-display rounded-2xl border border-border bg-card px-5 py-3.5 text-sm font-semibold transition-colors hover:bg-surface"
            >
              Back
            </button>
            <button
              onClick={finish}
              className="font-display flex-1 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Start scanning
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
