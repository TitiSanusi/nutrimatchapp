import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Loader2, Pencil } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Avatar, AvatarPicker } from "@/components/avatar";
import { CountrySelect } from "@/components/country-select";
import { goals, type GoalId } from "@/lib/nutrimatch";
import { MAX_GOALS, useNutriMatch } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile & settings — NutriMatch" },
      {
        name: "description",
        content:
          "View or change your name, photo, nutrition goals, age and country, or sign out of NutriMatch.",
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
  const { profile, saveProfile, signOut } = useNutriMatch();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age ? String(profile.age) : "");
  const [country, setCountry] = useState(profile.country);
  const [selected, setSelected] = useState<GoalId[]>(profile.goals);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Keep the form in step with the stored profile when it loads or changes.
  useEffect(() => {
    if (editing) return;
    setName(profile.name);
    setAge(profile.age ? String(profile.age) : "");
    setCountry(profile.country);
    setSelected(profile.goals);
  }, [profile, editing]);

  const selectedGoals = goals.filter((g) => selected.includes(g.id));

  const toggleGoal = (id: GoalId) => {
    setNotice("");
    setError("");
    if (selected.includes(id)) {
      if (selected.length === 1) {
        setNotice("Keep at least one goal so results stay personal.");
        return;
      }
      setSelected(selected.filter((g) => g !== id));
      return;
    }
    if (selected.length >= MAX_GOALS) {
      setNotice("You can choose up to three goals — deselect one first.");
      return;
    }
    setSelected([...selected, id]);
  };

  const save = async () => {
    const ageNumber = Number(age);
    if (name.trim().length < 2) {
      setError("Enter your name.");
      return;
    }
    if (!/^\d{1,3}$/.test(age.trim()) || ageNumber < 13 || ageNumber > 120) {
      setError("Enter an age between 13 and 120.");
      return;
    }
    if (!country) {
      setError("Choose your country.");
      return;
    }
    if (selected.length < 1) {
      setError("Pick at least one goal.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await saveProfile({
        name: name.trim().slice(0, 60),
        age: ageNumber,
        country,
        goals: selected,
      });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("We couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <AppShell title="Profile" subtitle="Your goals shape every result you see.">
      <p className="min-h-5 text-sm font-medium text-primary" aria-live="polite">
        {saved ? "Profile updated successfully." : ""}
      </p>

      <section className="card-soft mt-1 p-6">
        <div className="flex items-center gap-4">
          <Avatar
            src={profile.avatarUrl}
            name={profile.name}
            email={profile.email}
            className="size-16 text-base"
          />
          <div className="min-w-0 flex-1">
            <h2 className="font-display truncate text-lg font-semibold tracking-tight">
              {profile.name || "Your profile"}
            </h2>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{profile.email}</p>
          </div>
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="font-display inline-flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold transition-colors hover:bg-surface"
            >
              <Pencil className="size-3.5" aria-hidden />
              Edit profile
            </button>
          )}
        </div>

        <ul className="mt-5 flex flex-wrap gap-2">
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
          {profile.age ? `Age ${profile.age}` : "Age not set"} ·{" "}
          {profile.country || "Country not set"}
        </p>
      </section>

      {editing && (
        <>
          <section className="card-soft mt-4 p-6">
            <h2 className="font-display text-sm font-semibold">Profile photo</h2>
            <div className="mt-4">
              <AvatarPicker hint="JPG or PNG, up to 5 MB. Photo changes save straight away." />
            </div>
          </section>

          <section className="card-soft mt-4 p-6">
            <h2 className="font-display text-sm font-semibold">Your details</h2>

            <label className="mt-4 block text-xs font-medium text-muted-foreground" htmlFor="p-name">
              Name
            </label>
            <input
              id="p-name"
              value={name}
              maxLength={60}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="Your name"
              className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />

            <label className="mt-4 block text-xs font-medium text-muted-foreground" htmlFor="p-age">
              Age
            </label>
            <input
              id="p-age"
              inputMode="numeric"
              value={age}
              maxLength={3}
              onChange={(e) => {
                setAge(e.target.value.replace(/[^\d]/g, "").slice(0, 3));
                setError("");
              }}
              placeholder="28"
              className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">Between 13 and 120.</p>

            <label
              className="mt-4 block text-xs font-medium text-muted-foreground"
              htmlFor="p-country"
            >
              Country
            </label>
            <div className="mt-1.5">
              <CountrySelect
                id="p-country"
                value={country}
                onChange={(c) => {
                  setCountry(c);
                  setError("");
                }}
              />
            </div>
          </section>

          <section className="card-soft mt-4 p-6">
            <h2 className="font-display text-sm font-semibold">Your nutrition goals</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Pick one to three. Goals can change over time — new and past scans are re-read with
              what you choose.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {goals.map((g) => {
                const on = selected.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGoal(g.id)}
                    aria-pressed={on}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
                      on
                        ? "border-primary bg-strong-soft font-semibold"
                        : "border-border bg-card hover:bg-surface"
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
                {selected.length}/{MAX_GOALS} selected
              </span>
              {notice && <span className="text-primary"> · {notice}</span>}
            </p>
          </section>

          <p className="mt-3 min-h-4 px-1 text-xs text-destructive" aria-live="polite">
            {error}
          </p>

          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError("");
                setNotice("");
              }}
              className="font-display rounded-2xl border border-border bg-card px-5 py-3.5 text-sm font-semibold transition-colors hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="font-display flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Save Changes
            </button>
          </div>
        </>
      )}

      <section className="card-soft mt-4 p-6">
        <h2 className="font-display text-sm font-semibold">Account</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Signed in as {profile.email}. Your details stay with your account.
        </p>
        <button
          onClick={() => void handleSignOut()}
          className="font-display mt-4 w-full rounded-2xl border border-border bg-card py-3.5 text-sm font-semibold transition-colors hover:bg-surface"
        >
          Sign out
        </button>
      </section>
    </AppShell>
  );
}
