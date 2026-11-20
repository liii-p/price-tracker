import cron from "node-cron";
import { checkAllItems } from "./checker";

const state = globalThis as unknown as { __priceScheduler?: boolean };

export function startScheduler() {
  if (state.__priceScheduler || process.env.DISABLE_SCHEDULER === "true") return;
  const expression = process.env.CHECK_CRON || "0 */6 * * *";
  if (!cron.validate(expression)) {
    console.error(`[scheduler] Invalid CHECK_CRON "${expression}" — scheduled checks disabled.`);
    return;
  }
  state.__priceScheduler = true;
  cron.schedule(expression, async () => {
    const { skipped, results } = await checkAllItems();
    if (skipped) return console.log("[scheduler] previous check still running, skipped");
    const alerts = results.filter((r) => r.alerted).length;
    const errors = results.filter((r) => r.error).length;
    console.log(`[scheduler] checked ${results.length} items, ${alerts} alerts, ${errors} errors`);
  });
  console.log(`[scheduler] price checks scheduled: "${expression}"`);
}
