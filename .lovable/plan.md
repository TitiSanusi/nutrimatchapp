# Prompt 4 — Scan History (technical plan)

## What exists today (inspection findings)

**How signed-in users are identified.** Supabase auth via `src/lib/store.tsx`
(`NutriMatchProvider`): `supabase.auth.getSession()` + `onAuthStateChange` give a
`session`, and `session.user.id` is the user identity. Every page that needs a signed-in
user lives under `src/routes/_authenticated/`, gated by the managed `route.tsx` layout.

**Persistent storage already available.** Lovable Cloud (Postgres) with two tables:
`profiles` (name, age, country, `goals[]`, avatar_path, onboarded — owner-only RLS) and
`product_submissions` (owner-only RLS). Private `avatars` storage bucket. There is a
`set_updated_at()` trigger function and a `handle_new_user()` signup trigger already.

**History today is NOT persistent.** `store.tsx` keeps history in `localStorage` under
`nutrimatch.history.<userId>`, capped at 25 entries, and it stores the goal that was
active at scan time (`ScanEntry.goal`). Consequences: it does not survive a device
change, it is lost when browser storage is cleared, and the History list labels each
item with a stale goal. `src/routes/_authenticated/history.tsx` renders that list and a
"Clear" action. `recordScan` is called from `product.$barcode.tsx` in an effect once per
opened product.

**Scan/product flow.** `/scan` decodes a barcode, then navigates to
`/product/$barcode`, which calls the `lookupProduct` server function; on `found` it
renders `Found`, which scores with `scoreProductFit` against the profile's *current*
goals and requests Better Matches through `getAlternatives`.

## Proposed change

Move history from browser storage into the database, keep everything else as-is.

### Data model — one new table, `public.scan_history`

| column | purpose |
| --- | --- |
| `id` uuid pk | row id |
| `user_id` uuid not null → `auth.users` | owner |
| `barcode` text not null | the product |
| `product_name` text null | minimal display data |
| `brand` text null | minimal display data |
| `image_url` text null | minimal display data |
| `last_scanned_at` timestamptz not null default now() | most-recent scan time, used for ordering |
| `created_at` / `updated_at` timestamptz | standard, with the existing `set_updated_at` trigger |

- `unique (user_id, barcode)` — one visible row per product per user.
- index on `(user_id, last_scanned_at desc)` for the ordered list.
- No score, no label, no goals, no nutrition values are stored. Cached name/brand/image
  are display-only convenience fields, refreshed on each re-scan.

### Security / per-user isolation

RLS enabled, `authenticated`-only policies scoped to `auth.uid() = user_id` for read,
insert, update and delete; `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated`
and `GRANT ALL ... TO service_role` in the same migration. No `anon` grant. A user can
never see or touch another user's rows.

### When History is written

Only after a successful product identification: in `product.$barcode.tsx`, the existing
`recordScan` effect fires only inside `Found`, i.e. after `lookupProduct` returned
`status: "found"`. Not-found, unavailable and error states write nothing. That trigger
point does not change — only its implementation does.

### Duplicate handling (upsert)

`recordScan` becomes an async write that upserts on the `(user_id, barcode)` conflict
target, setting `last_scanned_at = now()` plus the refreshed name/brand/image. A repeat
scan therefore updates the timestamp and jumps to the top of the list instead of adding
a second visible item. Ordering is `last_scanned_at desc`.

### Reopening an item

Unchanged: each row links to `/product/$barcode` with `<Link to="/product/$barcode"
params={{ barcode }}>`. That route re-fetches the current validated product data and
scores it with `scoreProductFit` against the profile's *current* goals, and re-runs
Better Matches. So changing goals and reopening an old scan shows the new result —
nothing personalized is frozen in History.

### Migration required?

Yes — one migration creating `scan_history` with grants, RLS, policies, the unique
constraint, the index and the `updated_at` trigger. No changes to `profiles`,
`product_submissions`, storage, or auth.

### Persistence across sessions and devices

Because rows are keyed by `auth.uid()` in Postgres, signing out and back in — on any
device — reads the same list. The list is fetched with TanStack Query keyed by user id,
so it loads on demand rather than being held only in provider state.

## Implementation outline

1. Migration: `public.scan_history` as above.
2. `src/lib/history.functions.ts` — two server functions behind `requireSupabaseAuth`:
   `recordScan` (upsert, input-validated barcode + optional display fields) and
   `listScanHistory` (ordered read, capped at a sensible page size).
3. `src/lib/store.tsx` — `recordScan` calls the server function; drop the localStorage
   read/write and the stale `goal` field from `ScanEntry`; `clearHistory` deletes the
   user's rows. History list state moves out of the provider.
4. `src/routes/_authenticated/history.tsx` — same visual card list, fed by
   `useQuery(listScanHistory)`: image (or placeholder), product name, brand when
   available, most-recent scan date **and time**, chevron affordance, existing empty
   state with the "Scan a product" call to action. No filters, sorting, favourites,
   trends or analytics.
5. Bottom navigation already points at `/history` — untouched.

## Explicitly not changed

`src/lib/scoring/*`, `src/lib/food/*` (validation/normalization), `src/lib/recommend/*`,
`src/lib/product-fit.ts`, and the existing tests. History contains no scoring,
validation, recommendation or nutrition logic of its own.

## Open question

The current localStorage history cannot be migrated server-side. Existing signed-in
users would start with an empty History list unless we add a one-time client-side
backfill that uploads whatever is in their browser on first load. Happy to include that
small backfill or skip it — say which you prefer.
