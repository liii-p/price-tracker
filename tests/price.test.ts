import { describe, expect, it } from "vitest";
import { computeTargetPrice, evaluatePrice, parsePrice, percentDrop } from "@/lib/price";

describe("parsePrice", () => {
  it.each([
    ["$1,299.00", 1299],
    ["1.299,00 €", 1299],
    ["AU$ 49", 49],
    ["£12.5", 12.5],
    ["12,50", 12.5],
    ["1,299", 1299],
    ["1 299,99 kr", 1299.99],
    ["1.299.000", 1299000],
    ["USD 19.99", 19.99],
    ["$239.", 239],
    [42, 42],
  ])("parses %s", (input, expected) => {
    expect(parsePrice(input)).toBe(expected);
  });

  it.each([null, undefined, "", "Out of stock", -5, Number.NaN])("returns null for %s", (input) => {
    expect(parsePrice(input as string)).toBeNull();
  });
});

describe("computeTargetPrice", () => {
  it("applies a percentage discount to the baseline", () => {
    expect(computeTargetPrice("PERCENT", 25, 200)).toBe(150);
    expect(computeTargetPrice("PERCENT", 50, 349.95)).toBe(174.98);
  });
  it("uses an absolute price as-is", () => {
    expect(computeTargetPrice("PRICE", 199.999, 500)).toBe(200);
  });
});

describe("percentDrop", () => {
  it("is positive when the price fell", () => {
    expect(percentDrop(200, 150)).toBe(25);
    expect(percentDrop(200, 250)).toBe(-25);
    expect(percentDrop(0, 10)).toBe(0);
  });
});

describe("evaluatePrice", () => {
  const item = { targetPrice: 100, alerted: false };

  it("alerts when price reaches the target", () => {
    expect(evaluatePrice(item, 100)).toEqual({ sendAlert: true, belowTarget: true });
    expect(evaluatePrice(item, 80)).toEqual({ sendAlert: true, belowTarget: true });
  });
  it("does not alert above the target", () => {
    expect(evaluatePrice(item, 100.01)).toEqual({ sendAlert: false, belowTarget: false });
  });
  it("does not re-alert while the price stays below target", () => {
    expect(evaluatePrice({ ...item, alerted: true }, 90)).toEqual({ sendAlert: false, belowTarget: true });
  });
  it("reports re-arm once the price climbs back above target", () => {
    expect(evaluatePrice({ ...item, alerted: true }, 120).belowTarget).toBe(false);
  });
});
