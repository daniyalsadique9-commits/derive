const MATH_WORDS: Record<string, string> = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  Delta: "Δ",
  epsilon: "ε",
  theta: "θ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  pi: "π",
  rho: "ρ",
  sigma: "σ",
  tau: "τ",
  phi: "φ",
  omega: "ω",
  Omega: "Ω",
  infty: "∞",
  to: "→",
  rightarrow: "→",
  times: "×",
  cdot: "·",
  approx: "≈",
  le: "≤",
  ge: "≥",
  neq: "≠",
  pm: "±",
  propto: "∝",
  sqrt: "√",
};

const SUBSCRIPTS: Record<string, string> = {
  0: "₀",
  1: "₁",
  2: "₂",
  3: "₃",
  4: "₄",
  5: "₅",
  6: "₆",
  7: "₇",
  8: "₈",
  9: "₉",
  "+": "₊",
  "-": "₋",
  a: "ₐ",
  e: "ₑ",
  h: "ₕ",
  i: "ᵢ",
  j: "ⱼ",
  k: "ₖ",
  l: "ₗ",
  m: "ₘ",
  n: "ₙ",
  o: "ₒ",
  p: "ₚ",
  r: "ᵣ",
  s: "ₛ",
  t: "ₜ",
  u: "ᵤ",
  v: "ᵥ",
  x: "ₓ",
};

const SUPERSCRIPTS: Record<string, string> = {
  0: "⁰",
  1: "¹",
  2: "²",
  3: "³",
  4: "⁴",
  5: "⁵",
  6: "⁶",
  7: "⁷",
  8: "⁸",
  9: "⁹",
  "+": "⁺",
  "-": "⁻",
  n: "ⁿ",
  i: "ⁱ",
};

const KNOWN_COMMAND = new RegExp(`\\\\(${Object.keys(MATH_WORDS).join("|")})(?![A-Za-z])`, "g");

/** Uses Unicode sub/superscript characters when every character has one. */
function script(text: string, characters: Record<string, string>): string {
  const chars = [...text];
  return chars.every((char) => char in characters)
    ? chars.map((char) => characters[char]).join("")
    : text;
}

/** Mermaid can't render LaTeX, so `V_s`, `K_{max}` and `\lambda` become Vₛ, Kₘₐₓ and λ. */
export function plainMathLabel(label: string): string {
  return label
    .replace(/\$/g, "")
    .replace(KNOWN_COMMAND, (_, name: string) => MATH_WORDS[name])
    .replace(/\\n/g, " ")
    .replace(/\\([A-Za-z]+)/g, "$1")
    .replace(/_\{([^}]*)\}|_([A-Za-z0-9+-]+)/g, (_, braced?: string, bare?: string) =>
      script(braced ?? bare ?? "", SUBSCRIPTS),
    )
    .replace(/\^\{([^}]*)\}|\^([A-Za-z0-9+-])/g, (_, braced?: string, bare?: string) =>
      script(braced ?? bare ?? "", SUPERSCRIPTS),
    )
    .replace(/[{}]/g, "");
}

/**
 * Wraps plain square-bracket node labels in quotes: `A[Root (positive)]` → `A["Root (positive)"]`.
 * Models often put parentheses, "=" or "+" in labels, which Mermaid can't parse unquoted.
 * Other node shapes (`[[..]]`, `[(..)]`, `[/../]`) and already-quoted labels are left alone.
 */
export function quoteMermaidLabels(source: string): string {
  return source.replace(
    /\b([A-Za-z0-9_]+)\[(?!["[(/\\])([^\]\n]*)\]/g,
    (_, id: string, label: string) => `${id}["${label.replace(/"/g, "#quot;")}"]`,
  );
}

/** Makes a model-written diagram parseable, with plain-text maths in its labels. */
export function prepareMermaid(source: string): string {
  return quoteMermaidLabels(source)
    .replace(/"([^"\n]*)"/g, (_, label: string) => `"${plainMathLabel(label)}"`)
    .replace(/\|([^|\n]+)\|/g, (_, label: string) => `|${plainMathLabel(label)}|`);
}
