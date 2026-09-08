import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials, useNutriMatch } from "@/lib/store";

export function Avatar({
  className,
  src,
  name,
  email,
}: {
  className?: string;
  src?: string | null;
  name?: string;
  email?: string;
}) {
  const label = initials(name ?? "", email ?? "");
  return src ? (
    <img
      src={src}
      alt=""
      className={cn("shrink-0 rounded-full object-cover ring-1 ring-border", className ?? "size-10")}
    />
  ) : (
    <span
      aria-hidden
      className={cn(
        "font-display grid shrink-0 place-items-center rounded-full bg-strong-soft text-sm font-semibold text-strong ring-1 ring-border",
        className ?? "size-10",
      )}
    >
      {label}
    </span>
  );
}

const MAX_BYTES = 5 * 1024 * 1024;

/** Upload / preview / remove control used in both setup and profile settings. */
export function AvatarPicker({ hint }: { hint?: string }) {
  const { profile, uploadAvatar, removeAvatar } = useNutriMatch();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Please pick a photo under 5 MB.");
      return;
    }
    setBusy(true);
    try {
      await uploadAvatar(file);
    } catch {
      setError("That photo didn't upload. Please try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4">
        <Avatar
          src={profile.avatarUrl}
          name={profile.name}
          email={profile.email}
          className="size-20 text-lg"
        />
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => input.current?.click()}
              className="font-display inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold transition-colors hover:bg-surface disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <ImagePlus className="size-3.5" aria-hidden />
              )}
              {profile.avatarUrl ? "Change photo" : "Upload photo"}
            </button>
            {profile.avatarUrl && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setError("");
                  void removeAvatar();
                }}
                className="font-display inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-surface disabled:opacity-60"
              >
                <Trash2 className="size-3.5" aria-hidden />
                Remove
              </button>
            )}
          </div>
          {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Profile photo"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      <p className="mt-2 min-h-4 text-xs text-destructive" aria-live="polite">
        {error}
      </p>
    </div>
  );
}
