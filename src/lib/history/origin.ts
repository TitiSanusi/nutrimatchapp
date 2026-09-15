/**
 * Carries "this product page was opened by a real barcode scan" from the scan
 * screen to the product screen.
 *
 * How it works, and why:
 * - The scan screen mints a single-use token, stores it in `sessionStorage`
 *   against the scanned barcode, and passes the token through the router's
 *   navigation state (never through the URL, so nothing is shareable or
 *   bookmarkable and no data is exposed).
 * - The product screen redeems the token once, then deletes it.
 *
 * That makes every non-scan entry point a no-op automatically:
 * - reopening from history, opening a Better Match, a manual search pick and a
 *   pasted URL carry no token at all;
 * - a page refresh restores the browser history entry (and therefore the token)
 *   but the stored entry is already gone, so it cannot be redeemed twice.
 */

const PREFIX = "nutrimatch.scan.";

/** Router navigation state we attach. Only an opaque one-time token. */
declare module "@tanstack/history" {
  interface HistoryState {
    scanToken?: string;
  }
}

function storage(explicit?: Storage): Storage | null {
  if (explicit) return explicit;
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

/** Called on the scan screen after a barcode has been read. */
export function createScanToken(barcode: string, store?: Storage): string {
  const token =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  storage(store)?.setItem(PREFIX + token, barcode);
  return token;
}

/**
 * Called on the product screen. Returns true exactly once, and only when the
 * token was issued for this barcode.
 */
export function consumeScanToken(
  token: string | undefined,
  barcode: string,
  store?: Storage,
): boolean {
  if (!token) return false;
  const store_ = storage(store);
  if (!store_) return false;
  const key = PREFIX + token;
  const stored = store_.getItem(key);
  store_.removeItem(key);
  return stored === barcode;
}
