import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { countries, goals } from "@/lib/nutrimatch";
import { useNutriMatch } from "@/lib/store";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile & settings — NutriMatch" },
      {
        name: "description",
        content:
          "View or change your nutrition goal and country, update your details, or sign out of NutriMatch.",
      },
      { property: "og:title", content: "Profile & settings — NutriMatch" },
      {
        property: "og:description",
        content: "Change your goal and every future result is read through the new lens.",
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
  const currentGoal = goals.find((g) => g.id === profile.goal) ?? goals[0]!;

  const flash = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  return (
    <AppShell title="Profile" subtitle="Your goal shapes every result you see.">
      <section className="card-soft p-6">
        <p className="eyebrow text-primary">Current goal</p>
        <p className="font-display mt-2 text-lg font-semibold">{currentGoal.label}</p>
        <p className="mt-1 text-sm text-muted-foreground">For {currentGoal.blurb}.</p>
      </section>

      <section className="card-soft mt-4 p-6">
        <h2 className="font-display text-sm font-semibold">Change your goal</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          New scans and past scans are re-read with the goal you pick.
        </p>
        <div className="mt-4 space-y-2">
          {goals.map((g) => (
            <button
              key={g.id}
              onClick={() => {
                updateProfile({ goal: g.id });
                flash();
              }}
              aria-pressed={g.id === profile.goal}
              className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
                g.id === profile.goal
                  ? "border-primary bg-strong-soft font-semibold"
                  : "border-border bg-card hover:bg-surface"
              }`}
            >
              {g.label}
              {g.id === profile.goal && <Check className="size-4 text-primary" aria-hidden />}
            </button>
          ))}
        </div>
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

        <label className="mt-4 block text-xs font-medium text-muted-foreground" htmlFor="p-country">
          Country
        </label>
        <select
          id="p-country"
          value={profile.country}
          onChange={(e) => {
            updateProfile({ country: e.target.value });
            flash();
          }}
          className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

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
