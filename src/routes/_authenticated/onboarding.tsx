import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { AvatarPicker } from "@/components/avatar";
import { CountrySelect } from "@/components/country-select";
import { goals, type GoalId } from "@/lib/nutrimatch";
import { countryByName } from "@/lib/countries";
import { MAX_GOALS, useNutriMatch } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your profile — NutriMatch" },
      {
        name: "description",
        content:
          "Three quick steps: your age and country, the one to three nutrition goals NutriMatch should match foods against, and an optional photo.",
      },
      { property: "og:title", content: "Set up your profile — NutriMatch" },
      {
        property: "og:description",
        content: "Age, country, up to three nutrition goals and an optional photo — under a minute.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

const steps = ["About you", "Your goals", "Your photo"];

function Onboarding() {
  const { profile, ready, saveProfile } = useNutriMatch();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [age, setAge] = useState("");
  const [country, setCountry] = useState("");
  const [selected, setSelected] = useState<GoalId[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  // Seed from any saved profile so going back and forth keeps selections.
  useEffect(() => {
    if (!ready) return;
    if (profile.onboarded) {
      navigate({ to: "/home", replace: true });
      return;
    }
    setAge(profile.age ? String(profile.age) : "");
    setCountry(countryByName(profile.country) ? profile.country : "");
    setSelected(profile.goals);
  }, [ready]);

  const ageNumber = Number(age);
  const ageValid = /^\d{1,3}$/.test(age.trim()) && ageNumber >= 13 && ageNumber <= 120;

  const nextFromDetails = () => {
    if (!ageValid) {
      setError("Enter an age between 13 and 120.");
      return;
    }
    if (!country) {
      setError("Choose your country to continue.");
      return;
    }
    setError("");
    setStep(1);
  };

  const toggleGoal = (id: GoalId) => {
    setError("");
    if (selected.includes(id)) {
      setNotice("");
      setSelected(selected.filter((g) => g !== id));
      return;
    }
    if (selected.length >= MAX_GOALS) {
      setNotice("You can choose up to three goals — deselect one to swap it out.");
      return;
    }
    setNotice("");
    setSelected([...selected, id]);
  };

  const nextFromGoals = () => {
    if (selected.length < 1) {
      setError("Pick at least one goal so we know what to match against.");
      return;
    }
    setError("");
    setStep(2);
  };

  const finish = async () => {
    setSaving(true);
    try {
      await saveProfile({
        age: ageNumber,
        country,
        goals: selected,
        onboarded: true,
      });
      navigate({ to: "/home" });
    } catch {
      setError("We couldn't save your setup. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-6 py-10 sm:py-14">
      <div className="flex items-center gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            aria-label="Back"
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-card transition-colors hover:bg-surface"
          >
            <ArrowLeft className="size-4" aria-hidden />
          </button>
        )}
        <div className="flex flex-1 gap-2" aria-hidden>
          {steps.map((s, i) => (
            <span
              key={s}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
        <p className="eyebrow shrink-0 text-muted-foreground">
          {step + 1}/{steps.length}
        </p>
      </div>

      {step === 0 ? (
        <section className="mt-9">
          <p className="eyebrow text-primary">Step 1 · About you</p>
          <h1 className="font-display mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            A little about you
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Just two details. No health questionnaires, no calculations.
          </p>

          <label className="mt-8 block text-sm font-medium" htmlFor="age">
            Age
          </label>
          <input
            id="age"
            inputMode="numeric"
            value={age}
            maxLength={3}
            onChange={(e) => {
              setAge(e.target.value.replace(/[^\d]/g, ""));
              setError("");
            }}
            placeholder="28"
            aria-invalid={!!error && !ageValid}
            className={`mt-1.5 w-full rounded-xl border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring ${
              error && !ageValid ? "border-destructive" : "border-input"
            }`}
          />

          <label className="mt-5 block text-sm font-medium" htmlFor="country">
            Country
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            Labels and product ranges differ by country.
          </p>
          <div className="mt-1.5">
            <CountrySelect
              id="country"
              value={country}
              onChange={(c) => {
                setCountry(c);
                setError("");
              }}
              invalid={!!error && ageValid && !country}
            />
          </div>

          <p className="mt-3 min-h-4 text-xs text-destructive" aria-live="polite">
            {error}
          </p>

          <button
            type="button"
            onClick={nextFromDetails}
            className="font-display mt-4 w-full rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Continue
          </button>
        </section>
      ) : step === 1 ? (
        <section className="mt-9">
          <p className="eyebrow text-primary">Step 2 · Your goals</p>
          <h1 className="font-display mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            What are your nutrition goals?
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Choose up to three. Every food you look at is read against these.
          </p>

          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {goals.map((g) => {
              const on = selected.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGoal(g.id)}
                  aria-pressed={on}
                  className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                    on ? "border-primary bg-strong-soft" : "border-border bg-card hover:bg-surface"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{g.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">For {g.blurb}</span>
                  </span>
                  <span
                    aria-hidden
                    className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border"
                    }`}
                  >
                    {on && <Check className="size-3" />}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-3 min-h-4 text-xs" aria-live="polite">
            <span className="text-muted-foreground">
              {selected.length}/{MAX_GOALS} selected
            </span>
            {notice && <span className="text-primary"> · {notice}</span>}
            {error && <span className="text-destructive"> · {error}</span>}
          </p>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="font-display rounded-2xl border border-border bg-card px-5 py-3.5 text-sm font-semibold transition-colors hover:bg-surface"
            >
              Back
            </button>
            <button
              type="button"
              onClick={nextFromGoals}
              disabled={selected.length === 0}
              className="font-display flex-1 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </section>
      ) : (
        <section className="mt-9">
          <p className="eyebrow text-primary">Step 3 · Your photo</p>
          <h1 className="font-display mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Add a photo (optional)
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Entirely up to you. Without one we'll use your initials.
          </p>

          <div className="card-soft mt-6 p-6">
            <AvatarPicker hint="JPG or PNG, up to 5 MB. You can change or remove it any time." />
          </div>

          <p className="mt-3 min-h-4 text-xs text-destructive" aria-live="polite">
            {error}
          </p>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="font-display rounded-2xl border border-border bg-card px-5 py-3.5 text-sm font-semibold transition-colors hover:bg-surface"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => void finish()}
              disabled={saving}
              className="font-display flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {profile.avatarUrl ? "Finish setup" : "Skip & finish setup"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
