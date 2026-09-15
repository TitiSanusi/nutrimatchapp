import { countryByName } from "./countries";
import { goals as allGoals, type GoalId } from "./nutrimatch";

/** Shared profile field rules used by both onboarding and profile settings. */
export const MIN_AGE = 13;
export const MAX_AGE = 120;
export const MAX_GOALS = 3;
export const MAX_NAME_LENGTH = 60;

const validGoalIds = new Set(allGoals.map((g) => g.id as string));

export const isValidGoalId = (id: unknown): id is GoalId =>
  typeof id === "string" && validGoalIds.has(id);

/** Keeps a goal list valid: known ids only, de-duplicated, at most three. */
export function normalizeGoalSelection(list: unknown): GoalId[] {
  const seen = new Set<string>();
  const out: GoalId[] = [];
  for (const item of Array.isArray(list) ? list : []) {
    if (!isValidGoalId(item) || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
    if (out.length === MAX_GOALS) break;
  }
  return out;
}

export const isValidAge = (raw: string) => {
  const trimmed = raw.trim();
  if (!/^\d{1,3}$/.test(trimmed)) return false;
  const n = Number(trimmed);
  return n >= MIN_AGE && n <= MAX_AGE;
};

export const isValidCountry = (country: string) => !!countryByName(country.trim());

export const isValidName = (name: string) => name.trim().length >= 2;

export const isValidGoalCount = (selected: readonly GoalId[]) =>
  selected.length >= 1 && selected.length <= MAX_GOALS;

export type GoalToggleResult =
  | { selected: GoalId[]; notice: "" }
  | { selected: GoalId[]; notice: string };

/**
 * Shared goal toggle rule. `requireOne` keeps at least one goal selected
 * (profile settings); onboarding allows an empty draft before continuing.
 */
export function toggleGoalSelection(
  selected: readonly GoalId[],
  id: GoalId,
  options?: { requireOne?: boolean },
): GoalToggleResult {
  if (selected.includes(id)) {
    if (options?.requireOne && selected.length === 1) {
      return { selected: [...selected], notice: "Keep at least one goal so results stay personal." };
    }
    return { selected: selected.filter((g) => g !== id), notice: "" };
  }
  if (selected.length >= MAX_GOALS) {
    return {
      selected: [...selected],
      notice: "You can choose up to three goals — deselect one first.",
    };
  }
  return { selected: [...selected, id], notice: "" };
}
