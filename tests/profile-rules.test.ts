import { describe, expect, it } from "vitest";
import {
  MAX_GOALS,
  isValidAge,
  isValidCountry,
  isValidGoalCount,
  isValidName,
  normalizeGoalSelection,
  toggleGoalSelection,
} from "../src/lib/profile-rules";
import type { GoalId } from "../src/lib/nutrimatch";

describe("goal selection rules", () => {
  it("accepts one, two or three goals", () => {
    expect(isValidGoalCount(["less-sugar"])).toBe(true);
    expect(isValidGoalCount(["less-sugar", "lose-weight"])).toBe(true);
    expect(isValidGoalCount(["less-sugar", "lose-weight", "more-fibre"])).toBe(true);
  });

  it("rejects zero goals and more than three", () => {
    expect(isValidGoalCount([])).toBe(false);
    expect(
      isValidGoalCount(["less-sugar", "lose-weight", "more-fibre", "more-protein"]),
    ).toBe(false);
  });

  it("does not add a fourth goal", () => {
    const three: GoalId[] = ["less-sugar", "lose-weight", "more-fibre"];
    const next = toggleGoalSelection(three, "more-protein");
    expect(next.selected).toEqual(three);
    expect(next.notice).not.toBe("");
  });

  it("keeps at least one goal when requireOne is set", () => {
    const next = toggleGoalSelection(["less-sugar"], "less-sugar", { requireOne: true });
    expect(next.selected).toEqual(["less-sugar"]);
    expect(next.notice).not.toBe("");
  });

  it("allows an empty draft during onboarding", () => {
    expect(toggleGoalSelection(["less-sugar"], "less-sugar").selected).toEqual([]);
  });

  it("toggles goals on and off and preserves order", () => {
    const a = toggleGoalSelection([], "lose-weight");
    const b = toggleGoalSelection(a.selected, "more-fibre");
    expect(b.selected).toEqual(["lose-weight", "more-fibre"]);
    expect(toggleGoalSelection(b.selected, "lose-weight").selected).toEqual(["more-fibre"]);
  });

  it("normalizes stored goals: unknown ids dropped, de-duplicated, capped", () => {
    expect(
      normalizeGoalSelection([
        "less-sugar",
        "less-sugar",
        "nope",
        42,
        "lose-weight",
        "more-fibre",
        "more-protein",
      ]),
    ).toEqual(["less-sugar", "lose-weight", "more-fibre"]);
    expect(normalizeGoalSelection(null)).toEqual([]);
    expect(normalizeGoalSelection(["less-sugar"]).length).toBeLessThanOrEqual(MAX_GOALS);
  });
});

describe("profile field rules", () => {
  it("validates age between 13 and 120", () => {
    expect(isValidAge("13")).toBe(true);
    expect(isValidAge("120")).toBe(true);
    expect(isValidAge("12")).toBe(false);
    expect(isValidAge("121")).toBe(false);
    expect(isValidAge("")).toBe(false);
    expect(isValidAge("abc")).toBe(false);
  });

  it("validates country against the known list", () => {
    expect(isValidCountry("Canada")).toBe(true);
    expect(isValidCountry("")).toBe(false);
    expect(isValidCountry("Atlantis")).toBe(false);
  });

  it("validates name", () => {
    expect(isValidName("Al")).toBe(true);
    expect(isValidName(" a ")).toBe(false);
  });
});
