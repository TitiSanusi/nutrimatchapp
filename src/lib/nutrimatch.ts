export type GoalId =
  | "lose-weight"
  | "maintain-weight"
  | "gain-weight"
  | "more-protein"
  | "more-fibre"
  | "less-sugar"
  | "less-sodium";

export type Goal = {
  id: GoalId;
  label: string;
  blurb: string;
};

export const goals: Goal[] = [
  { id: "lose-weight", label: "Lose weight", blurb: "lighter portions that still satisfy" },
  { id: "maintain-weight", label: "Maintain weight", blurb: "steady, balanced choices" },
  { id: "gain-weight", label: "Gain weight", blurb: "more energy in every serving" },
  { id: "more-protein", label: "Eat more protein", blurb: "staying full between meals" },
  { id: "more-fibre", label: "Eat more fibre", blurb: "more fibre through the day" },
  { id: "less-sugar", label: "Reduce added sugar", blurb: "fewer sweetened surprises" },
  { id: "less-sodium", label: "Reduce sodium", blurb: "gentler on salt" },
];

export const countries = [
  "United Kingdom",
  "United States",
  "Ireland",
  "Germany",
  "France",
  "Spain",
  "Netherlands",
  "Sweden",
  "India",
  "Nigeria",
  "Australia",
  "Canada",
];

export type Product = {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  serving: string;
  emoji: string;
  /** per serving */
  calories: number;
  protein: number;
  fibre: number;
  addedSugar: number;
  sodium: number;
  satFat: number;
  ingredients: string;
};

export const products: Product[] = [
  {
    id: "honey-granola-bar",
    barcode: "5010023918204",
    name: "Honey Almond Granola Bar",
    brand: "Halcyon",
    category: "Snack bars",
    serving: "1 bar · 40g",
    emoji: "🍫",
    calories: 190,
    protein: 4,
    fibre: 2,
    addedSugar: 14,
    sodium: 115,
    satFat: 3.5,
    ingredients: "Oats, honey, glucose syrup, almonds, sunflower oil, salt.",
  },
  {
    id: "berry-yoghurt",
    barcode: "4006381333931",
    name: "Berry Skyr Yoghurt",
    brand: "Nordvik",
    category: "Yoghurt",
    serving: "1 pot · 150g",
    emoji: "🫐",
    calories: 120,
    protein: 15,
    fibre: 1,
    addedSugar: 6,
    sodium: 60,
    satFat: 0.3,
    ingredients: "Skimmed milk, live cultures, blueberry purée, cane sugar.",
  },
  {
    id: "lentil-soup",
    barcode: "8712100845123",
    name: "Smoked Lentil Soup",
    brand: "Oakmere Kitchen",
    category: "Soups",
    serving: "1 cup · 245g",
    emoji: "🥣",
    calories: 180,
    protein: 12,
    fibre: 9,
    addedSugar: 2,
    sodium: 680,
    satFat: 0.8,
    ingredients: "Water, lentils, carrot, onion, smoked paprika, salt, yeast extract.",
  },
  {
    id: "oat-milk",
    barcode: "7350044111024",
    name: "Almond Oat Drink, Unsweetened",
    brand: "Hearth & Vale",
    category: "Drinks",
    serving: "1 glass · 250ml",
    emoji: "🥛",
    calories: 90,
    protein: 1,
    fibre: 1.5,
    addedSugar: 0,
    sodium: 45,
    satFat: 0.4,
    ingredients: "Water, oats, almonds, sea salt, calcium carbonate.",
  },
  {
    id: "berry-toast",
    barcode: "5000112637922",
    name: "Whole-Grain Seeded Bread",
    brand: "Bryant Farm",
    category: "Bakery",
    serving: "1 slice · 62g",
    emoji: "🍞",
    calories: 160,
    protein: 8,
    fibre: 7,
    addedSugar: 1,
    sodium: 290,
    satFat: 1.2,
    ingredients: "Whole wheat flour, water, sunflower seeds, linseed, yeast, salt.",
  },
  {
    id: "peanut-butter",
    barcode: "3017620422003",
    name: "Crunchy Peanut Butter, No Sugar",
    brand: "Ridgewell",
    category: "Spreads",
    serving: "2 tbsp · 32g",
    emoji: "🥜",
    calories: 200,
    protein: 9,
    fibre: 3,
    addedSugar: 0,
    sodium: 55,
    satFat: 3,
    ingredients: "Roasted peanuts (99%), sea salt.",
  },
  {
    id: "cheese-crackers",
    barcode: "5449000000996",
    name: "Cheese & Chive Crackers",
    brand: "Mallow Lane",
    category: "Crackers",
    serving: "6 crackers · 30g",
    emoji: "🧀",
    calories: 155,
    protein: 3,
    fibre: 1,
    addedSugar: 2,
    sodium: 520,
    satFat: 4.2,
    ingredients: "Wheat flour, cheese powder, palm oil, salt, chives, raising agents.",
  },
  {
    id: "choc-cereal",
    barcode: "5053827194334",
    name: "Chocolate Hoops Cereal",
    brand: "Marlow Mills",
    category: "Cereal",
    serving: "1 bowl · 45g",
    emoji: "🥣",
    calories: 175,
    protein: 3,
    fibre: 2,
    addedSugar: 17,
    sodium: 210,
    satFat: 1.8,
    ingredients: "Wheat, sugar, cocoa powder, glucose syrup, salt, flavouring.",
  },
  {
    id: "roasted-chickpeas",
    barcode: "0850000010293",
    name: "Sea Salt Roasted Chickpeas",
    brand: "Fielder & Co",
    category: "Snacks",
    serving: "1 pack · 40g",
    emoji: "🫘",
    calories: 150,
    protein: 8,
    fibre: 6,
    addedSugar: 0,
    sodium: 190,
    satFat: 0.6,
    ingredients: "Chickpeas, sunflower oil, sea salt.",
  },
  {
    id: "tomato-pasta-sauce",
    barcode: "8001300112242",
    name: "Tomato & Basil Pasta Sauce",
    brand: "Casa Pello",
    category: "Sauces",
    serving: "1/2 jar · 175g",
    emoji: "🍅",
    calories: 95,
    protein: 3,
    fibre: 3,
    addedSugar: 4,
    sodium: 430,
    satFat: 0.5,
    ingredients: "Tomatoes, onion, olive oil, basil, salt, sugar.",
  },
];

export const productById = (id: string) => products.find((p) => p.id === id);
export const productByBarcode = (code: string) => products.find((p) => p.barcode === code);

export type MatchLevel = "strong" | "moderate" | "gentle";

export type Factor = {
  key: string;
  label: string;
  value: string;
  reason: string;
  level: MatchLevel;
  score: number;
  weight: number;
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const level = (score: number): MatchLevel =>
  score >= 0.7 ? "strong" : score >= 0.45 ? "moderate" : "gentle";

type FactorKey = "calories" | "energy" | "protein" | "fibre" | "sugar" | "sodium" | "satfat";

function buildFactor(key: FactorKey, p: Product, weight: number): Factor {
  switch (key) {
    case "calories": {
      const score = clamp(1 - (p.calories - 70) / 260);
      return {
        key,
        label: "Calories",
        value: `${p.calories} kcal`,
        reason:
          p.calories <= 130
            ? `${p.calories} kcal per serving is light, so it leaves room in the rest of your day.`
            : `${p.calories} kcal per serving is moderate — worth counting as part of a meal rather than an extra.`,
        level: level(score),
        score,
        weight,
      };
    }
    case "energy": {
      const score = clamp(p.calories / 260);
      return {
        key,
        label: "Calories",
        value: `${p.calories} kcal`,
        reason:
          p.calories >= 180
            ? `${p.calories} kcal per serving helps you add energy without a large portion.`
            : `${p.calories} kcal per serving is on the lighter side, so you may need a second serving or a side.`,
        level: level(score),
        score,
        weight,
      };
    }
    case "protein": {
      const score = clamp(p.protein / 14);
      return {
        key,
        label: "Protein",
        value: `${p.protein}g`,
        reason:
          p.protein >= 10
            ? `${p.protein}g is a solid amount — it helps this hold you until your next meal.`
            : `${p.protein}g on its own won't keep you full for long.`,
        level: level(score),
        score,
        weight,
      };
    }
    case "fibre": {
      const score = clamp(p.fibre / 7);
      return {
        key,
        label: "Fibre",
        value: `${p.fibre}g`,
        reason:
          p.fibre >= 5
            ? `${p.fibre}g is a real contribution towards the 30g most adults aim for.`
            : `${p.fibre}g is a small share of a day's fibre.`,
        level: level(score),
        score,
        weight,
      };
    }
    case "sugar": {
      const score = clamp(1 - p.addedSugar / 20);
      return {
        key,
        label: "Added sugar",
        value: `${p.addedSugar}g`,
        reason:
          p.addedSugar === 0
            ? "No added sugar in the ingredients list."
            : p.addedSugar <= 6
              ? `${p.addedSugar}g of added sugar sits at the low end for this kind of product.`
              : `${p.addedSugar}g of added sugar is around ${Math.round((p.addedSugar / 30) * 100)}% of a typical daily allowance.`,
        level: level(score),
        score,
        weight,
      };
    }
    case "sodium": {
      const score = clamp(1 - p.sodium / 650);
      return {
        key,
        label: "Sodium",
        value: `${p.sodium}mg`,
        reason: `About ${Math.round((p.sodium / 2300) * 100)}% of a daily sodium reference in one serving.`,
        level: level(score),
        score,
        weight,
      };
    }
    case "satfat": {
      const score = clamp(1 - p.satFat / 6);
      return {
        key,
        label: "Saturated fat",
        value: `${p.satFat}g`,
        reason:
          p.satFat <= 1.5
            ? `${p.satFat}g is gentle for a serving this size.`
            : `${p.satFat}g is noticeable for a portion this size.`,
        level: level(score),
        score,
        weight,
      };
    }
  }
}

const recipes: Record<GoalId, Array<[FactorKey, number]>> = {
  "lose-weight": [
    ["calories", 3],
    ["fibre", 1.4],
    ["sugar", 1.4],
    ["protein", 1],
  ],
  "maintain-weight": [
    ["calories", 1.4],
    ["protein", 1.2],
    ["fibre", 1.2],
    ["sugar", 1],
    ["sodium", 0.8],
  ],
  "gain-weight": [
    ["energy", 3],
    ["protein", 1.6],
    ["satfat", 0.6],
  ],
  "more-protein": [
    ["protein", 3],
    ["calories", 0.9],
    ["sugar", 0.8],
  ],
  "more-fibre": [
    ["fibre", 3],
    ["sugar", 0.9],
    ["protein", 0.8],
  ],
  "less-sugar": [
    ["sugar", 3],
    ["fibre", 1.1],
    ["protein", 0.9],
  ],
  "less-sodium": [
    ["sodium", 3],
    ["satfat", 1.1],
    ["fibre", 0.8],
  ],
};

export type MatchResult = {
  level: MatchLevel;
  label: string;
  score: number;
  factors: Factor[];
  explanation: string;
  suggestion: string;
};

const levelLabel: Record<MatchLevel, string> = {
  strong: "Good match",
  moderate: "Moderate match",
  gentle: "Worth a closer look",
};

export function matchProduct(p: Product, goalId: GoalId): MatchResult {
  const goal = goals.find((g) => g.id === goalId) ?? goals[0]!;
  const factors = recipes[goalId].map(([key, weight]) => buildFactor(key, p, weight));
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const score = Math.round(
    (factors.reduce((s, f) => s + f.score * f.weight, 0) / totalWeight) * 100,
  );
  const lvl = level(score / 100);

  const ranked = [...factors].sort((a, b) => b.score * b.weight - a.score * a.weight);
  const best = ranked[0]!;
  const weakest = ranked[ranked.length - 1]!;

  const explanation =
    lvl === "strong"
      ? `The parts that matter most for ${goal.blurb} line up here — ${best.label.toLowerCase()} at ${best.value} in particular. ${weakest.label} (${weakest.value}) is the one thing to keep an eye on, and it doesn't change the overall picture.`
      : lvl === "moderate"
        ? `This can still fit your goal. ${best.label} at ${best.value} works in your favour, while ${weakest.label.toLowerCase()} at ${weakest.value} pulls the other way. It's a reasonable choice in a smaller portion, or alongside something lighter.`
        : `For ${goal.blurb}, ${weakest.label.toLowerCase()} at ${weakest.value} is doing the most to hold this back. That doesn't put it off-limits — it's just less of a fit today, and a similar product may suit you better.`;

  const suggestion =
    lvl === "strong"
      ? "Nothing to change here — this one already sits with your goal."
      : `Compare it with a similar product that has ${
          weakest.key === "sugar"
            ? "less added sugar"
            : weakest.key === "sodium"
              ? "less salt"
              : weakest.key === "protein"
                ? "more protein"
                : weakest.key === "fibre"
                  ? "more fibre"
                  : weakest.key === "satfat"
                    ? "less saturated fat"
                    : "a lighter serving"
        }.`;

  return { level: lvl, label: levelLabel[lvl], score, factors, explanation, suggestion };
}

export function betterMatches(p: Product, goalId: GoalId, limit = 3) {
  const base = matchProduct(p, goalId).score;
  return products
    .filter((other) => other.id !== p.id)
    .map((other) => ({ product: other, match: matchProduct(other, goalId) }))
    .filter((row) => row.match.score > base)
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, limit);
}

export function searchProducts(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return products;
  return products.filter((p) =>
    [p.name, p.brand, p.category, p.barcode].some((field) => field.toLowerCase().includes(q)),
  );
}
