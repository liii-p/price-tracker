"use client";

import { useState } from "react";
import { computeTargetPrice, formatMoney, parsePrice } from "@/lib/price";

type Choice = "25" | "50" | "percent" | "price";

export function initialChoice(targetType?: string, targetValue?: number): Choice {
  if (targetType === "PRICE") return "price";
  if (targetType !== "PERCENT" || targetValue === 25) return "25";
  if (targetValue === 50) return "50";
  return "percent";
}

const inputCls =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500";

export function TargetPicker({
  baselinePrice,
  currency,
  defaultChoice = "25",
  defaultValue,
}: {
  baselinePrice: string;
  currency: string | null;
  defaultChoice?: Choice;
  defaultValue?: number;
}) {
  const [choice, setChoice] = useState<Choice>(defaultChoice);
  const [percent, setPercent] = useState(defaultChoice === "percent" && defaultValue ? String(defaultValue) : "30");
  const [price, setPrice] = useState(defaultChoice === "price" && defaultValue ? String(defaultValue) : "");

  const baseline = parsePrice(baselinePrice);
  let target: number | null = null;
  if (choice === "price") target = parsePrice(price);
  else if (baseline != null) {
    const pct = choice === "percent" ? parsePrice(percent) : Number(choice);
    if (pct != null && pct < 100) target = computeTargetPrice("PERCENT", pct, baseline);
  }

  const option = (value: Choice, label: React.ReactNode) => (
    <label
      className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
        choice === value
          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
          : "border-zinc-300 dark:border-zinc-700"
      }`}
    >
      <input
        type="radio"
        name="targetChoice"
        value={value}
        checked={choice === value}
        onChange={() => setChoice(value)}
        className="accent-emerald-600"
      />
      {label}
    </label>
  );

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium">Notify me when the price drops to…</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {option("25", "25% off")}
        {option("50", "50% off")}
        {option(
          "percent",
          <span className="flex items-center gap-1">
            <input
              name="customPercent"
              inputMode="decimal"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              onFocus={() => setChoice("percent")}
              className={`${inputCls} w-16 py-1`}
              aria-label="Custom percentage"
            />
            % off
          </span>,
        )}
        {option(
          "price",
          <span className="flex items-center gap-1">
            Below
            <input
              name="targetPrice"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onFocus={() => setChoice("price")}
              placeholder="e.g. 199"
              className={`${inputCls} w-24 py-1`}
              aria-label="Target price"
            />
          </span>,
        )}
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Target price: <strong className="text-zinc-900 dark:text-zinc-100">{formatMoney(target, currency)}</strong>
      </p>
    </fieldset>
  );
}

export { inputCls };
