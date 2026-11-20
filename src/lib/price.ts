export type TargetType = "PERCENT" | "PRICE";

/**
 * Parse a human-formatted price string into a number.
 * Handles "$1,299.00", "1.299,00 €", "AU$ 49", "£12.5", "1 299,99".
 */
export function parsePrice(input: string | number | null | undefined): number | null {
  if (input == null) return null;
  if (typeof input === "number") return Number.isFinite(input) && input >= 0 ? input : null;

  const match = input.replace(/ /g, " ").match(/\d[\d.,\s]*/);
  if (!match) return null;
  let s = match[0].trim().replace(/\s/g, "");

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");

  if (lastDot !== -1 && lastComma !== -1) {
    // Whichever separator comes last is the decimal separator.
    const decimal = lastDot > lastComma ? "." : ",";
    const thousands = decimal === "." ? "," : ".";
    s = s.split(thousands).join("").replace(decimal, ".");
  } else if (lastComma !== -1) {
    const decimals = s.length - lastComma - 1;
    const commas = s.split(",").length - 1;
    // "12,50" -> decimal comma; "1,299" / "1,299,000" -> thousands separators
    s = commas === 1 && decimals !== 3 ? s.replace(",", ".") : s.split(",").join("");
  } else if (lastDot !== -1 && s.split(".").length - 1 > 1) {
    // "1.299.000" -> thousands separators
    s = s.split(".").join("");
  }

  s = s.replace(/[.,]$/, "");
  const n = Number.parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** The price at or below which the user should be alerted. */
export function computeTargetPrice(type: TargetType, value: number, baselinePrice: number): number {
  if (type === "PERCENT") return round2(baselinePrice * (1 - value / 100));
  return round2(value);
}

/** Percentage drop from `from` to `to` (positive = cheaper). */
export function percentDrop(from: number, to: number): number {
  if (from <= 0) return 0;
  return ((from - to) / from) * 100;
}

/**
 * Decide whether a newly observed price should trigger an alert.
 * Alerts once when the price crosses to/below target, then re-arms when the
 * price climbs back above the target, so a later drop alerts again.
 */
export function evaluatePrice(
  item: { targetPrice: number; alerted: boolean },
  price: number,
): { sendAlert: boolean; belowTarget: boolean } {
  const belowTarget = price <= item.targetPrice;
  return { sendAlert: belowTarget && !item.alerted, belowTarget };
}

export function formatMoney(amount: number | null | undefined, currency?: string | null): string {
  if (amount == null) return "—";
  if (currency && /^[A-Z]{3}$/.test(currency)) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
    } catch {
      // fall through for unknown currency codes
    }
  }
  return amount.toFixed(2);
}
