import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Log in — NutriMatch" },
      {
        name: "description",
        content: "Log in to NutriMatch to pick up your nutrition goals and scan history.",
      },
      { property: "og:title", content: "Log in — NutriMatch" },
      {
        property: "og:description",
        content: "Return to your NutriMatch goals and previous scans.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) || trimmed.length > 255) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }

    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    });
    setBusy(false);

    if (signInError) {
      setError("That email and password don't match an account.");
      return;
    }
    // Setup is skipped automatically for anyone who already finished it.
    navigate({ to: "/home" });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-14">
      <form onSubmit={submit} className="card-soft w-full max-w-md p-7">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Log in to pick up your goals and previous scans.
        </p>

        <label className="mt-6 block text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          maxLength={255}
          autoComplete="email"
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          placeholder="you@example.com"
          className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        <label className="mt-4 block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          maxLength={72}
          autoComplete="current-password"
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          placeholder="Your password"
          className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        <p className="mt-2 min-h-4 text-xs text-destructive" aria-live="polite">
          {error}
        </p>

        <button
          type="submit"
          disabled={busy}
          className="font-display mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Log in
        </button>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          New here?{" "}
          <Link to="/signup" className="font-medium text-primary">
            Create an account
          </Link>
        </p>
      </form>
    </main>
  );
}
