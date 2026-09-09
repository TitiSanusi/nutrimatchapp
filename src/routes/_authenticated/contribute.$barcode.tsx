import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useNutriMatch } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/contribute/$barcode")({
  head: () => ({
    meta: [
      { title: "Help us add a product — NutriMatch" },
      {
        name: "description",
        content:
          "Send photos of a pack we don't have yet: the front, the nutrition facts panel and the ingredient list.",
      },
      { property: "og:title", content: "Help us add a product — NutriMatch" },
      {
        property: "og:description",
        content: "A few photos of the pack and we'll add this product for everyone.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContributePage,
});

type Slot = "front" | "nutrition" | "ingredients";

const slots: { key: Slot; label: string; hint: string }[] = [
  { key: "front", label: "Front of the package", hint: "Show the product name and brand clearly." },
  { key: "nutrition", label: "Nutrition facts panel", hint: "Include the whole table." },
  { key: "ingredients", label: "Ingredient list", hint: "Include allergen text if it's there." },
];

const MAX_BYTES = 8 * 1024 * 1024;

function ContributePage() {
  const { barcode } = Route.useParams();
  const { session } = useNutriMatch();
  const navigate = useNavigate();

  const [files, setFiles] = useState<Partial<Record<Slot, File>>>({});
  const [previews, setPreviews] = useState<Partial<Record<Slot, string>>>({});
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const pick = (slot: Slot, file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a photo.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("That photo is larger than 8 MB. Try a smaller one.");
      return;
    }
    setFiles((f) => ({ ...f, [slot]: file }));
    setPreviews((p) => {
      if (p[slot]) URL.revokeObjectURL(p[slot]!);
      return { ...p, [slot]: URL.createObjectURL(file) };
    });
  };

  const clear = (slot: Slot) => {
    setFiles(({ [slot]: _drop, ...rest }) => rest);
    setPreviews((p) => {
      if (p[slot]) URL.revokeObjectURL(p[slot]!);
      const { [slot]: _gone, ...rest } = p;
      return rest;
    });
  };

  const submit = async () => {
    const userId = session?.user.id;
    if (!userId) return;
    if (!files.front && !files.nutrition && !files.ingredients && !name.trim()) {
      toast.error("Add at least one photo or the product name.");
      return;
    }

    setSaving(true);
    try {
      const paths: Partial<Record<Slot, string>> = {};
      for (const slot of ["front", "nutrition", "ingredients"] as Slot[]) {
        const file = files[slot];
        if (!file) continue;
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${userId}/${barcode}-${slot}-${Date.now()}.${ext}`;
        const { error } = await supabase.storage
          .from("product-submissions")
          .upload(path, file, { upsert: true, contentType: file.type });
        if (error) throw error;
        paths[slot] = path;
      }

      const { error } = await supabase.from("product_submissions").insert({
        user_id: userId,
        barcode,
        product_name: name.trim() || null,
        brand: brand.trim() || null,
        notes: notes.trim() || null,
        front_photo_path: paths.front ?? null,
        nutrition_photo_path: paths.nutrition ?? null,
        ingredients_photo_path: paths.ingredients ?? null,
      });
      if (error) throw error;

      setDone(true);
      toast.success("Thanks — your submission is in.");
    } catch {
      toast.error("We couldn't send that just now. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <AppShell title="Thank you">
        <section className="card-soft p-6">
          <Check className="size-6 text-strong" aria-hidden />
          <h1 className="font-display mt-3 text-lg font-semibold tracking-tight">
            Submission received
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            We've saved your photos for barcode <span className="tabular-nums">{barcode}</span>. Until
            it's verified, this information stays marked as submitted by a person, separate from the
            verified food database.
          </p>
          <button
            onClick={() => void navigate({ to: "/home" })}
            className="font-display mt-5 w-full rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to home
          </button>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell title="Help us add this product" subtitle={`Barcode ${barcode}`}>
      <Link
        to="/product/$barcode"
        params={{ barcode }}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back
      </Link>

      <section className="card-soft mt-4 p-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Clear photos let us add the real label information. We won't guess any nutrition value that
          isn't readable on the pack.
        </p>

        <div className="mt-5 space-y-4">
          {slots.map(({ key, label, hint }) => (
            <div key={key} className="rounded-2xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
                </div>
                {previews[key] && (
                  <button
                    onClick={() => clear(key)}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
                  >
                    <X className="size-3.5" aria-hidden />
                    Remove
                  </button>
                )}
              </div>

              {previews[key] ? (
                <img
                  src={previews[key]}
                  alt={`${label} preview`}
                  className="mt-3 max-h-48 w-full rounded-xl bg-surface object-contain ring-1 ring-border"
                />
              ) : null}

              <label className="font-display mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-surface py-3 text-sm font-semibold transition-colors hover:bg-muted">
                <ImagePlus className="size-4" aria-hidden />
                {previews[key] ? "Change photo" : "Add photo"}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => pick(key, e.target.files?.[0])}
                />
              </label>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="cb-name" className="text-sm font-semibold">
              Product name (optional)
            </label>
            <input
              id="cb-name"
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="cb-brand" className="text-sm font-semibold">
              Brand (optional)
            </label>
            <input
              id="cb-brand"
              value={brand}
              maxLength={120}
              onChange={(e) => setBrand(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="cb-notes" className="text-sm font-semibold">
              Anything else (optional)
            </label>
            <textarea
              id="cb-notes"
              value={notes}
              maxLength={500}
              rows={3}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <button
          onClick={() => void submit()}
          disabled={saving}
          className="font-display mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {saving ? "Sending…" : "Send submission"}
        </button>
      </section>
    </AppShell>
  );
}
