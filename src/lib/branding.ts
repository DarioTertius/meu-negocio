/** Geração da paleta da marca a partir de uma cor única escolhida pelo cliente. */

export const DEFAULT_BRAND = "#136350";

export function sanitizeHex(hex?: string | null): string {
  return /^#[0-9a-fA-F]{6}$/.test(hex ?? "") ? (hex as string) : DEFAULT_BRAND;
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function mix(base: [number, number, number], target: number, weight: number): string {
  const [r, g, b] = base.map((c) => Math.round(c * (1 - weight) + target * weight));
  return `rgb(${r} ${g} ${b})`;
}

/** CSS com as variáveis --brand-50..950 derivadas da cor base (usada como tom 700). */
export function paletteCss(baseHex: string): string {
  const base = hexToRgb(sanitizeHex(baseHex));
  const shades: [string, string][] = [
    ["50", mix(base, 255, 0.95)],
    ["100", mix(base, 255, 0.88)],
    ["200", mix(base, 255, 0.75)],
    ["300", mix(base, 255, 0.6)],
    ["400", mix(base, 255, 0.4)],
    ["500", mix(base, 255, 0.2)],
    ["600", mix(base, 255, 0.08)],
    ["700", mix(base, 0, 0)],
    ["800", mix(base, 0, 0.15)],
    ["900", mix(base, 0, 0.3)],
    ["950", mix(base, 0, 0.55)],
  ];
  return `:root{${shades.map(([k, v]) => `--brand-${k}:${v}`).join(";")}}`;
}
