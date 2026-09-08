import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — NutriMatch" },
      {
        name: "description",
        content:
          "Create a NutriMatch account to save your nutrition goals and see how foods match them.",
      },
      { property: "og:title", content: "Create your account — NutriMatch" },
      {
        property: "og:description",
        content: "Name, email and a password is all it takes to start matching foods to your goals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignUp,
});

function SignUp() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (trimmedName.length < 2) {
      setError("Enter your name so we know what to call you.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) || trimmedEmail.length > 255) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Use a password of at least 8 characters.");
      return;
    }

    setBusy(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: { name: trimmedName.slice(0, 60) },
        emailRedirectTo: window.location.origin,
      },
    });
    setBusy(false);

    if (signUpError) {
      setError(
        signUpError.message.toLowerCase().includes("already")
          ? "That email already has an account. Log in instead."
          : signUpError.message,
      );
      return;
    }
    if (!data.session) {
      setError("Check your email to confirm your account, then log in.");
      return;
    }
    navigate({ to: "/onboarding" });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-14">
      <form onSubmit={submit} className="card-soft w-full max-w-md p-7">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A few details now, then a quick setup of your goals.
        </p>

        <label className="mt-6 block text-sm font-medium" htmlFor="su-name">
          Name
        </label>
        <input
          id="su-name"
          value={name}
          maxLength={60}
          autoComplete="name"
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          placeholder="Alex Rivera"
          className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        <label className="mt-4 block text-sm font-medium" htmlFor="su-email">
          Email
        </label>
        <input
          id="su-email"
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

        <label className="mt-4 block text-sm font-medium" htmlFor="su-password">
          Password
        </label>
        <input
          id="su-password"
          type="password"
          value={password}
          maxLength={72}
          autoComplete="new-password"
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          placeholder="At least 8 characters"
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
          Continue
        </button>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Already with us?{" "}
          <Link to="/signin" className="font-medium text-primary">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}
