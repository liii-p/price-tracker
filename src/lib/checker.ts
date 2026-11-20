import { prisma } from "./db";
import { sendPriceAlert } from "./email";
import { evaluatePrice } from "./price";
import { scrapeProduct } from "./scraper";
import type { Item } from "@/generated/prisma/client";

export type CheckResult = { id: string; title: string; price?: number; alerted?: boolean; error?: string };

/**
 * Record an observed price for an item: stores history, updates current/lowest,
 * and sends an alert if the price has crossed below the target.
 */
export async function recordPrice(item: Item, price: number): Promise<CheckResult> {
  const { sendAlert, belowTarget } = evaluatePrice(item, price);
  let alerted = belowTarget ? item.alerted : false; // re-arm once back above target
  let lastError: string | null = null;

  if (sendAlert) {
    try {
      await sendPriceAlert(item, price);
      alerted = true;
    } catch (err) {
      lastError = (err as Error).message; // leave un-alerted so the next check retries
    }
  }

  await prisma.item.update({
    where: { id: item.id },
    data: {
      currentPrice: price,
      lowestPrice: item.lowestPrice == null ? price : Math.min(item.lowestPrice, price),
      lastCheckedAt: new Date(),
      lastError,
      alerted,
      pricePoints: { create: { price } },
    },
  });
  return { id: item.id, title: item.title, price, alerted: sendAlert && alerted, error: lastError ?? undefined };
}

export async function checkItem(item: Item): Promise<CheckResult> {
  try {
    const { price } = await scrapeProduct(item.url);
    return await recordPrice(item, price);
  } catch (err) {
    const error = (err as Error).message;
    await prisma.item.update({ where: { id: item.id }, data: { lastCheckedAt: new Date(), lastError: error } });
    return { id: item.id, title: item.title, error };
  }
}

const state = globalThis as unknown as { __priceCheckRunning?: boolean };

/** Check every active item, one at a time with a short pause to be polite to shops. */
export async function checkAllItems(): Promise<{ skipped: boolean; results: CheckResult[] }> {
  if (state.__priceCheckRunning) return { skipped: true, results: [] };
  state.__priceCheckRunning = true;
  try {
    const items = await prisma.item.findMany({ where: { status: "ACTIVE" } });
    const results: CheckResult[] = [];
    for (const [i, item] of items.entries()) {
      if (i > 0) await new Promise((r) => setTimeout(r, 1500));
      results.push(await checkItem(item));
    }
    return { skipped: false, results };
  } finally {
    state.__priceCheckRunning = false;
  }
}

/** After a target change, alert immediately if the last known price already meets the new target. */
export async function reevaluateCurrent(item: Item): Promise<void> {
  if (item.currentPrice == null) return;
  const { sendAlert, belowTarget } = evaluatePrice(item, item.currentPrice);
  let alerted = belowTarget ? item.alerted : false;
  let lastError = item.lastError;
  if (sendAlert) {
    try {
      await sendPriceAlert(item, item.currentPrice);
      alerted = true;
    } catch (err) {
      lastError = (err as Error).message;
    }
  }
  await prisma.item.update({ where: { id: item.id }, data: { alerted, lastError } });
}
