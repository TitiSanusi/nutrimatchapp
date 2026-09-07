export type GoalId = "balanced" | "lower-sugar" | "more-protein" | "heart";

export type Tone = "supportive" | "caution" | "info";

export type Goal = {
  id: GoalId;
  label: string;
  cadence: string;
  blurb: string;
};

export type Product = {
  id: string;
  name: string;
  brand: string;
  serving: string;
  emoji: string;
  calories: number;
  protein: number;
  fiber: number;
  sugar: number;
  sodium: number;
  satFat: number;
  ingredientNote: string;
  nudges: Partial<Record<GoalId, string>>;
};

export const goals: Goal[] = [
  {
    id: "balanced",
    label: "Balanced",
    cadence: "Daily",
    blurb: "steady energy across the day",
  },
  {
    id: "lower-sugar",
    label: "Lower added sugar",
    cadence: "Daily",
    blurb: "fewer sweetened surprises",
  },
  {
    id: "more-protein",
    label: "More protein",
    cadence: "Daily",
    blurb: "staying full between meals",
  },
  {
    id: "heart",
    label: "Heart-minded",
    cadence: "Daily",
    blurb: "gentler sodium and saturated fat",
  },
];

export const products: Product[] = [
  {
    id: "berry-toast",
    name: "Whole-Grain Berry Toast",
    brand: "Bryant Farm",
    serving: "1 slice · 62g",
    emoji: "🍞",
    calories: 310,
    protein: 10,
    fiber: 7,
    sugar: 12,
    sodium: 290,
    satFat: 1.5,
    ingredientNote: "Whole wheat flour leads the list; fruit spread adds the sweetness.",
    nudges: {
      balanced: "Add a handful of berries for extra fiber and antioxidants.",
      "lower-sugar": "Use half the spread and top with fresh fruit — same sweetness, less added sugar.",
      "more-protein": "A spoon of cottage cheese on top takes this past 18g protein.",
      heart: "Sodium is mid-range here; keep the rest of breakfast unsalted.",
    },
  },
  {
    id: "oat-milk",
    name: "Almond Oat Milk, Plain",
    brand: "Hearth & Vale",
    serving: "300ml carton",
    emoji: "🥛",
    calories: 90,
    protein: 1,
    fiber: 1.5,
    sugar: 0,
    sodium: 45,
    satFat: 0.4,
    ingredientNote: "Oats, almonds, water — no syrup or cane sugar in the list.",
    nudges: {
      balanced: "Pair it with a wholegrain cereal so the meal carries more staying power.",
      "lower-sugar": "This is the unsweetened version — worth checking the shelf label next time, the vanilla one has 7g.",
      "more-protein": "Soy milk in the same aisle brings 3g protein for the same calories.",
      heart: "Comfortably low on both sodium and saturated fat.",
    },
  },
  {
    id: "granola-bar",
    name: "Honey Almond Granola Bar",
    brand: "Halcyon",
    serving: "1 bar · 40g",
    emoji: "🍫",
    calories: 190,
    protein: 4,
    fiber: 2,
    sugar: 14,
    sodium: 115,
    satFat: 3.5,
    ingredientNote: "Honey and glucose syrup appear in the first four ingredients.",
    nudges: {
      balanced: "Fine as an occasional snack; a piece of fruit alongside evens out the sugar spike.",
      "lower-sugar": "14g is most of this bar's carbs. A plain nut mix gets you the same crunch without it.",
      "more-protein": "4g won't hold you long — a bar with nuts or whey listed first would suit you better.",
      heart: "Saturated fat is on the higher side for a small snack.",
    },
  },
  {
    id: "lentil-soup",
    name: "Smoked Lentil Soup",
    brand: "Oakmere Kitchen",
    serving: "1 cup · 245g",
    emoji: "🥣",
    calories: 180,
    protein: 12,
    fiber: 9,
    sugar: 3,
    sodium: 680,
    satFat: 0.8,
    ingredientNote: "Lentils and vegetables lead; salt does a lot of the flavour work.",
    nudges: {
      balanced: "Generous fiber and protein — a solid anchor for lunch.",
      "lower-sugar": "Barely any added sugar here, nothing to adjust.",
      "more-protein": "12g is a good base; a spoon of yoghurt or seeds takes it further.",
      heart: "Sodium is the thing to watch — around 30% of a day in one cup. Look for the reduced-salt tub.",
    },
  },
];

export type Factor = {
  key: string;
  label: string;
  value: string;
  reason: string;
  tone: Tone;
  weight: number;
  score: number;
};

const tone = (score: number): Tone =>
  score >= 0.72 ? "supportive" : score >= 0.45 ? "info" : "caution";

const clamp = (n: number) => Math.max(0, Math.min(1, n));

function sugarFactor(p: Product, emphasis: number): Factor {
  const score = clamp(1 - p.sugar / 20);
  return {
    key: "sugar",
    label: "Added sugar",
    value: `${p.sugar}g`,
    reason:
      p.sugar === 0
        ? "Nothing added — there is nothing here to subtract."
        : p.sugar <= 6
          ? `${p.sugar}g sits at the low end for this kind of product.`
          : `${p.sugar}g is roughly ${Math.round((p.sugar / 40) * 100)}% of a typical daily allowance.`,
    tone: tone(score),
    weight: emphasis,
    score,
  };
}

function fiberFactor(p: Product, emphasis: number): Factor {
  const score = clamp(p.fiber / 8);
  return {
    key: "fiber",
    label: "Fiber",
    value: `${p.fiber}g`,
    reason:
      p.fiber >= 6
        ? `${p.fiber}g is a real contribution — it slows how quickly the carbs arrive.`
        : `${p.fiber}g is modest, so this feels lighter than it looks.`,
    tone: tone(score),
    weight: emphasis,
    score,
  };
}

function proteinFactor(p: Product, emphasis: number): Factor {
  const score = clamp(p.protein / 15);
  return {
    key: "protein",
    label: "Protein",
    value: `${p.protein}g`,
    reason:
      p.protein >= 10
        ? `${p.protein}g helps this hold you until the next meal.`
        : `${p.protein}g won't carry you far on its own.`,
    tone: tone(score),
    weight: emphasis,
    score,
  };
}

function sodiumFactor(p: Product, emphasis: number): Factor {
  const score = clamp(1 - p.sodium / 800);
  return {
    key: "sodium",
    label: "Sodium",
    value: `${p.sodium}mg`,
    reason: `About ${Math.round((p.sodium / 2300) * 100)}% of a daily reference in one serving.`,
    tone: tone(score),
    weight: emphasis,
    score,
  };
}

function satFatFactor(p: Product, emphasis: number): Factor {
  const score = clamp(1 - p.satFat / 6);
  return {
    key: "satfat",
    label: "Saturated fat",
    value: `${p.satFat}g`,
    reason:
      p.satFat <= 1.5
        ? `${p.satFat}g is gentle for a serving this size.`
        : `${p.satFat}g is noticeable for a small portion.`,
    tone: tone(score),
    weight: emphasis,
    score,
  };
}

type Emphasis = {
  sugar: number;
  fiber: number;
  protein: number;
  sodium: number;
  satfat: number;
};

const emphasisByGoal: Record<GoalId, Emphasis> = {
  balanced: { sugar: 1, fiber: 1, protein: 1, sodium: 0.8, satfat: 0.6 },
  "lower-sugar": { sugar: 3, fiber: 1.5, protein: 0.8, sodium: 0.4, satfat: 0.4 },
  "more-protein": { protein: 3, fiber: 1, sugar: 0.8, sodium: 0.5, satfat: 0.5 },
  heart: { sodium: 3, satfat: 2.2, fiber: 1.2, sugar: 0.8, protein: 0.6 },
};

export type Reading = {
  factors: Factor[];
  fit: number;
  headline: string;
  summary: string;
  nudge: string;
};

export function readProduct(p: Product, goalId: GoalId): Reading {
  const e = emphasisByGoal[goalId];
  const all = [
    sugarFactor(p, e.sugar),
    fiberFactor(p, e.fiber),
    proteinFactor(p, e.protein),
    sodiumFactor(p, e.sodium),
    satFatFactor(p, e.satfat),
  ];

  const totalWeight = all.reduce((s, f) => s + f.weight, 0);
  const fit = Math.round(
    (all.reduce((s, f) => s + f.score * f.weight, 0) / totalWeight) * 100,
  );

  const factors = [...all].sort((a, b) => b.weight - a.weight);
  const goal = goals.find((g) => g.id === goalId)!;

  const headline =
    fit >= 75
      ? `Works well for ${goal.label.toLowerCase()}`
      : fit >= 55
        ? `Reasonable fit, with one thing to watch`
        : `Worth a closer look for your goal`;

  const lead = factors[0];
  const summary =
    fit >= 75
      ? `The things that matter most for ${goal.blurb} line up here — ${lead.label.toLowerCase()} in particular.`
      : fit >= 55
        ? `Most of this suits ${goal.blurb}; ${lead.label.toLowerCase()} is the part that pulls against it.`
        : `For ${goal.blurb}, ${lead.label.toLowerCase()} is doing the most to hold this back. That doesn't make it off-limits.`;

  return {
    factors,
    fit,
    headline,
    summary,
    nudge: p.nudges[goalId] ?? "Read the label alongside the rest of your day, not on its own.",
  };
}

export function alternativesFor(p: Product, goalId: GoalId) {
  return products
    .filter((other) => other.id !== p.id)
    .map((other) => ({ product: other, reading: readProduct(other, goalId) }))
    .sort((a, b) => b.reading.fit - a.reading.fit)
    .slice(0, 2);
}
