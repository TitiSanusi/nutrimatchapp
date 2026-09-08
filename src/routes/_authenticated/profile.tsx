import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CountrySelect } from "@/components/country-select";
import { goals } from "@/lib/nutrimatch";
import { MAX_GOALS, useNutriMatch } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile & settings — NutriMatch" },
      {
        name: "description",
        content:
          "View or change your nutrition goals, age and country, update your details, or sign out of NutriMatch.",
      },
      { property: "og:title", content: "Profile & settings — NutriMatch" },
      {
        property: "og:description",
        content: "Change your goals and every future result is read through the new lens.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, updateProfile, signOut } = useNutriMatch();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const selectedGoals = goals.filter((g) => profile.goals.includes(g.id));

  const flash = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const toggleGoal = (id: (typeof goals)[number]["id"]) => {
    setNotice("");
    const on = profile.goals.includes(id);
    if (on && profile.goals.length === 1) {
      setNotice("Keep at least one goal so results stay personal.");
      return;
    }
    if (!on && profile.goals.length >= MAX_GOALS) {
      setNotice("You can choose up to three goals — deselect one first.");
      return;
    }
    updateProfile({
      goals: on ? profile.goals.filter((g) => g !== id) : [...profile.goals, id],
    });
    flash();
  };

  return (
    <AppShell title="Profile" subtitle="Your goals shape every result you see.">
      <section className="card-soft p-6">
        <p className="eyebrow text-primary">Your goals</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {selectedGoals.map((g) => (
            <li
              key={g.id}
              className="font-display rounded-full bg-strong-soft px-3 py-1.5 text-xs font-semibold text-strong"
            >
              {g.label}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          {profile.age ? `Age ${profile.age}` : "Age not set"} · {profile.country}
        </p>
      </section>

      <section className="card-soft mt-4 p-6">
        <h2 className="font-display text-sm font-semibold">Change your goals</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Pick one to three. New scans and past scans are re-read with what you choose.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {goals.map((g) => {
            const on = profile.goals.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGoal(g.id)}
                aria-pressed={on}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
                  on ? "border-primary bg-strong-soft font-semibold" : "border-border bg-card hover:bg-surface"
                }`}
              >
                {g.label}
                {on && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
              </button>
            );
          })}
        </div>
        <p className="mt-3 min-h-4 text-xs" aria-live="polite">
          <span className="text-muted-foreground">
            {profile.goals.length}/{MAX_GOALS} selected
          </span>
          {notice && <span className="text-primary"> · {notice}</span>}
        </p>
      </section>

      <section className="card-soft mt-4 p-6">
        <h2 className="font-display text-sm font-semibold">Account</h2>

        <label className="mt-4 block text-xs font-medium text-muted-foreground" htmlFor="p-name">
          Name
        </label>
        <input
          id="p-name"
          value={profile.name}
          maxLength={60}
          onChange={(e) => updateProfile({ name: e.target.value })}
          placeholder="Your name"
          className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        <label className="mt-4 block text-xs font-medium text-muted-foreground" htmlFor="p-email">
          Email
        </label>
        <input
          id="p-email"
          type="email"
          value={profile.email}
          maxLength={255}
          onChange={(e) => updateProfile({ email: e.target.value })}
          placeholder="you@example.com"
          className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        <label className="mt-4 block text-xs font-medium text-muted-foreground" htmlFor="p-age">
          Age
        </label>
        <input
          id="p-age"
          inputMode="numeric"
          value={profile.age ? String(profile.age) : ""}
          maxLength={3}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^\d]/g, "").slice(0, 3);
            const n = Number(digits);
            updateProfile({ age: digits && n >= 13 && n <= 120 ? n : null });
          }}
          placeholder="28"
          className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="mt-1 text-xs text-muted-foreground">Between 13 and 120.</p>

        <label className="mt-4 block text-xs font-medium text-muted-foreground" htmlFor="p-country">
          Country
        </label>
        <div className="mt-1.5">
          <CountrySelect
            id="p-country"
            value={profile.country}
            onChange={(c) => {
              updateProfile({ country: c });
              flash();
            }}
          />
        </div>

        <p className="mt-3 h-4 text-xs text-primary" aria-live="polite">
          {saved ? "Saved" : ""}
        </p>

        <button
          onClick={() => {
            signOut();
            navigate({ to: "/" });
          }}
          className="font-display mt-2 w-full rounded-2xl border border-border bg-card py-3.5 text-sm font-semibold transition-colors hover:bg-surface"
        >
          Sign out
        </button>
      </section>
    </AppShell>
  );
}
