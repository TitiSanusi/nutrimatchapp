import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useNutriMatch } from "@/lib/store";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Sign in — NutriMatch" },
      {
        name: "description",
        content: "Sign in to NutriMatch to pick up your nutrition goal and scan history.",
      },
      { property: "og:title", content: "Sign in — NutriMatch" },
      {
        property: "og:description",
        content: "Return to your NutriMatch goal and previous scans.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const { profile, updateProfile } = useNutriMatch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) || trimmed.length > 255) {
      setError("Enter a valid email address.");
      return;
    }
    updateProfile({ email: trimmed, name: name.trim().slice(0, 60) });
    navigate({ to: profile.onboarded ? "/home" : "/onboarding" });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-14">
      <form onSubmit={submit} className="card-soft w-full max-w-md p-7">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to pick up your goal and previous scans.
        </p>

        <label className="mt-6 block text-sm font-medium" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          placeholder="Alex Rivera"
          className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        <label className="mt-4 block text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          maxLength={255}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          placeholder="you@example.com"
          className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

        <button
          type="submit"
          className="font-display mt-6 w-full rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Continue
        </button>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          New here?{" "}
          <Link to="/onboarding" className="font-medium text-primary">
            Get started
          </Link>
        </p>
      </form>
    </main>
  );
}
