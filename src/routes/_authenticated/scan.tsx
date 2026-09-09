import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BarcodeScanner } from "@/components/barcode-scanner";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [
      { title: "Scan a barcode — NutriMatch" },
      {
        name: "description",
        content:
          "Point your camera at a packaged food barcode to pull up the product, or type the barcode number by hand.",
      },
      { property: "og:title", content: "Scan a barcode — NutriMatch" },
      {
        property: "og:description",
        content: "Scan the pack and NutriMatch pulls up the real label information.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScanPage,
});

function ScanPage() {
  const navigate = useNavigate();
  const [handling, setHandling] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  const open = useCallback(
    (barcode: string) => {
      setHandling(true);
      void navigate({ to: "/product/$barcode", params: { barcode } });
    },
    [navigate],
  );

  return (
    <AppShell title="Scan a product" subtitle="Hold the barcode inside the frame.">
      <BarcodeScanner onDetected={open} paused={handling} />

      {handling && (
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Finding your product…
        </p>
      )}

      <div className="card-soft mt-5 p-6">
        <h2 className="font-display text-sm font-semibold">Scanning not working?</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Type the barcode number printed on the pack, or search by name instead.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const clean = code.trim();
            if (/^\d{8,14}$/.test(clean)) {
              setCodeError(null);
              open(clean);
            } else {
              setCodeError("A barcode is 8 to 14 digits. Check the number and try again.");
            }
          }}
          className="mt-4 flex flex-col gap-2 sm:flex-row"
        >
          <input
            value={code}
            inputMode="numeric"
            maxLength={14}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, ""));
              setCodeError(null);
            }}
            placeholder="e.g. 3017620422003"
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

        {codeError && <p className="mt-3 text-sm text-moderate">{codeError}</p>}

        <Link
          to="/search"
          className="font-display mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-sm font-semibold transition-colors hover:bg-surface"
        >
          <Search className="size-4.5" aria-hidden />
          Search manually instead
        </Link>
      </div>
    </AppShell>
  );
}
