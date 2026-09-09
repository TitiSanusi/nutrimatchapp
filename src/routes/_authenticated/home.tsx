import { createFileRoute, Link } from "@tanstack/react-router";
import { ScanLine, Search, ChevronRight, ImageOff } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Avatar } from "@/components/avatar";
import { goals } from "@/lib/nutrimatch";
import { firstName, useNutriMatch } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — NutriMatch" },
      {
        name: "description",
        content:
          "Scan a packaged food barcode to pull up its real label information, or search for the product by name.",
      },
      { property: "og:title", content: "Home — NutriMatch" },
      {
        property: "og:description",
        content: "Your goals, your recent scans, and one tap to scan the next product.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { profile, history, ready } = useNutriMatch();
  const myGoals = goals.filter((g) => profile.goals.includes(g.id));
  const first = firstName(profile.name);
  const recent = history.slice(0, 3);

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-4">
        <p className="font-display text-lg font-semibold tracking-tight">
          {first ? `Welcome back, ${first}!` : "Welcome back!"}
        </p>
        <Link to="/profile" aria-label="Profile and settings" className="shrink-0">
          <Avatar
            src={profile.avatarUrl}
            name={profile.name}
            email={profile.email}
            className="size-10 text-xs"
          />
        </Link>
      </div>

      <section className="card-soft mt-4 p-6">
        <p className="eyebrow text-primary">{myGoals.length > 1 ? "Your goals" : "Your goal"}</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {myGoals.map((g) => (
            <li
              key={g.id}
              className="font-display rounded-full bg-strong-soft px-3 py-1.5 text-xs font-semibold text-strong"
            >
              {g.label}
            </li>
          ))}
        </ul>
        <h1 className="font-display mt-3 text-[26px] leading-tight font-semibold tracking-tight">
          What are you eating today?
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Scan a packaged food to see what's really on the label.
        </p>

        <Link
          to="/scan"
          className="font-display mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <ScanLine className="size-4.5" aria-hidden />
          Scan a product
        </Link>
        <Link
          to="/search"
          className="font-display mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 text-sm font-semibold transition-colors hover:bg-surface"
        >
          <Search className="size-4.5" aria-hidden />
          Search for a product
        </Link>
      </section>

      <section className="mt-5">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display text-sm font-semibold">Recent scans</h2>
          <Link to="/history" className="text-xs font-medium text-primary">
            View all
          </Link>
        </div>

        {!ready ? null : recent.length === 0 ? (
          <p className="card-soft mt-3 p-5 text-sm text-muted-foreground">
            Nothing scanned yet. Your first scan will show up here.
          </p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {recent.map((entry) => (
              <li key={entry.barcode}>
                <Link
                  to="/product/$barcode"
                  params={{ barcode: entry.barcode }}
                  className="card-soft flex items-center gap-4 p-4 transition-shadow hover:shadow-lift"
                >
                  {entry.imageUrl ? (
                    <img
                      src={entry.imageUrl}
                      alt=""
                      loading="lazy"
                      className="size-14 shrink-0 rounded-2xl bg-surface object-contain ring-1 ring-border"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="grid size-14 shrink-0 place-items-center rounded-2xl bg-surface ring-1 ring-border"
                    >
                      <ImageOff className="size-5 text-muted-foreground" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {entry.name ?? `Barcode ${entry.barcode}`}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {entry.brand ?? "Brand unavailable"}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
