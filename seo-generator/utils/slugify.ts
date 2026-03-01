export const greekToLatinMap: Record<string, string> = {
  α: "a",
  β: "v",
  γ: "g",
  δ: "d",
  ε: "e",
  ζ: "z",
  η: "i",
  θ: "th",
  ι: "i",
  κ: "k",
  λ: "l",
  μ: "m",
  ν: "n",
  ξ: "x",
  ο: "o",
  π: "p",
  ρ: "r",
  σ: "s",
  ς: "s",
  τ: "t",
  υ: "y",
  φ: "f",
  χ: "ch",
  ψ: "ps",
  ω: "o",
};

const greekDiacriticsMap: Record<string, string> = {
  ά: "α",
  έ: "ε",
  ή: "η",
  ί: "ι",
  ό: "ο",
  ύ: "υ",
  ώ: "ω",
  ϊ: "ι",
  ΐ: "ι",
  ϋ: "υ",
  ΰ: "υ",
};

export function slugify(input: string): string {
  const normalizedGreek = input
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .split("")
    .map((char) => greekDiacriticsMap[char] ?? char)
    .map((char) => greekToLatinMap[char] ?? char)
    .join("");

  return normalizedGreek
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
