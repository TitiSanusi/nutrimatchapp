/**
 * Energy (calorie) resolution for label data.
 *
 * Providers sometimes carry an explicit kcal field, a kJ field, or both — and the
 * two can contradict each other or the macronutrients on the same label. This
 * module picks the value that the rest of the label supports, and returns `null`
 * (shown as "Unavailable") when the data cannot be trusted. It never invents an
 * energy value from macronutrients; macros are used only as a sanity check.
 */

export const KJ_PER_KCAL = 4.184;

export type EnergyInput = {
  /** Energy already expressed in kcal, if the source provides it. */
  kcal?: number | null;
  /** Energy expressed in kJ, if the source provides it. */
  kj?: number | null;
  /** Macronutrients on the same basis, used only for a consistency check. */
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
};

export type EnergyResolution = {
  /** kcal on the same basis as the inputs, or null when not reliably known. */
  kcal: number | null;
  reason:
    | "reported_kcal"
    | "converted_from_kj"
    | "inconsistent"
    | "missing";
};

const isNum = (v: number | null | undefined): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Atwater-style expectation, used purely to detect nonsense — never displayed. */
function macroExpectation(input: EnergyInput): number | null {
  const { protein, carbs, fat } = input;
  if (!isNum(protein) || !isNum(carbs) || !isNum(fat)) return null;
  return protein * 4 + carbs * 4 + fat * 9;
}

/** Relative difference, tolerant around very small values. */
function offBy(value: number, reference: number) {
  const scale = Math.max(reference, 5);
  return Math.abs(value - reference) / scale;
}

const AGREEMENT_TOLERANCE = 0.15; // kcal vs kJ must line up within 15%
const MACRO_TOLERANCE = 0.4; // label rounding + fibre/polyols leave real slack

export function resolveEnergyKcal(input: EnergyInput): EnergyResolution {
  const reported = isNum(input.kcal) ? input.kcal : null;
  const fromKj = isNum(input.kj) ? input.kj / KJ_PER_KCAL : null;
  const expected = macroExpectation(input);

  if (reported === null && fromKj === null) return { kcal: null, reason: "missing" };

  // Both present: trust them when they agree (no double conversion applied).
  if (reported !== null && fromKj !== null) {
    if (offBy(reported, fromKj) <= AGREEMENT_TOLERANCE) {
      return { kcal: round1(reported), reason: "reported_kcal" };
    }
    if (expected !== null) {
      const reportedOff = offBy(reported, expected);
      const kjOff = offBy(fromKj, expected);
      if (reportedOff <= MACRO_TOLERANCE && reportedOff <= kjOff) {
        return { kcal: round1(reported), reason: "reported_kcal" };
      }
      if (kjOff <= MACRO_TOLERANCE) {
        return { kcal: round1(fromKj), reason: "converted_from_kj" };
      }
    }
    return { kcal: null, reason: "inconsistent" };
  }

  const single = reported !== null ? reported : (fromKj as number);
  const reason = reported !== null ? "reported_kcal" : "converted_from_kj";
  if (expected !== null && offBy(single, expected) > MACRO_TOLERANCE) {
    return { kcal: null, reason: "inconsistent" };
  }
  return { kcal: round1(single), reason };
}
