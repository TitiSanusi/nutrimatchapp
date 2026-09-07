import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, ScanLine, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { products, productByBarcode } from "@/lib/nutrimatch";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Scan a barcode — NutriMatch" },
      {
        name: "description",
        content:
          "Point at a barcode to pull up the product, or enter the barcode number by hand if scanning isn't available.",
      },
      { property: "og:title", content: "Scan a barcode — NutriMatch" },
      {
        property: "og:description",
        content: "Scan the pack, and NutriMatch reads the label against your goal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScanPage,
});

type Phase = "idle" | "scanning" | "not-found";

function ScanPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("idle");
  const [code, setCode] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  const resolve = (barcode: string) => {
    setPhase("scanning");
    timer.current = setTimeout(() => {
      const found = productByBarcode(barcode.trim());
      if (found) {
        navigate({ to: "/product/$productId", params: { productId: found.id } });
      } else {
        setPhase("not-found");
      }
    }, 1400);
  };

  const demoScan = () => {
    const pick = products[Math.floor(Math.random() * products.length)]!;
    resolve(pick.barcode);
  };

  return (
    <AppShell title="Scan product" subtitle="Line the barcode up inside the frame.">
      <div className="card-soft overflow-hidden p-5">
        <div className="relative grid aspect-4/3 place-items-center overflow-hidden rounded-2xl bg-foreground/90">
          <div className="absolute inset-8 rounded-2xl border-2 border-primary-foreground/60" />
          {phase === "scanning" ? (
            <div className="relative flex flex-col items-center gap-3 text-primary-foreground">
              <Loader2 className="size-7 animate-spin" aria-hidden />
              <p className="text-sm">Reading the label…</p>
            </div>
          ) : (
            <div className="relative flex flex-col items-center gap-3 px-6 text-center text-primary-foreground/85">
              <ScanLine className="size-7" aria-hidden />
              <p className="text-sm">Camera preview</p>
              <p className="text-xs text-primary-foreground/60">
                Barcode scanning runs on your device. Use the button below to try it with a sample
                pack.
              </p>
            </div>
          )}
        </div>

        <button
          onClick={demoScan}
          disabled={phase === "scanning"}
          className="font-display mt-5 w-full rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {phase === "scanning" ? "Scanning…" : "Scan barcode"}
        </button>
      </div>

      <div className="card-soft mt-5 p-6">
        <h2 className="font-display text-sm font-semibold">Scanning not working?</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Type the barcode number from the pack, or search by name instead.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (/^\d{8,14}$/.test(code.trim())) resolve(code);
            else setPhase("not-found");
          }}
          className="mt-4 flex flex-col gap-2 sm:flex-row"
        >
          <input
            value={code}
            inputMode="numeric"
            maxLength={14}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, ""));
              setPhase("idle");
            }}
            placeholder="e.g. 5010023918204"
            aria-label="Barcode number"
            className="min-w-0 flex-1 rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="font-display rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold transition-colors hover:bg-muted"
          >
            Look up
          </button>
        </form>

        {phase === "not-found" && (
          <p className="mt-3 text-sm text-muted-foreground">
            We couldn't find that barcode yet. Try searching by product name.
          </p>
        )}

        <Link
          to="/search"
          className="font-display mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-sm font-semibold transition-colors hover:bg-surface"
        >
          <Search className="size-4.5" aria-hidden />
          Search Product
        </Link>
      </div>
    </AppShell>
  );
}
