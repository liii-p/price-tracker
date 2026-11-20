import { Resend } from "resend";
import { formatMoney, percentDrop } from "./price";

export type AlertItem = {
  id: string;
  title: string;
  url: string;
  currency: string | null;
  baselinePrice: number;
  targetPrice: number;
  imageUrl: string | null;
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function buildAlertEmail(item: AlertItem, price: number) {
  const fmt = (n: number) => formatMoney(n, item.currency);
  const drop = percentDrop(item.baselinePrice, price);
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const subject = `Price drop: ${item.title} is now ${fmt(price)}`;
  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:auto;color:#111">
  <h2 style="margin:0 0 8px">Your price target was hit 🎉</h2>
  ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="" style="max-width:200px;max-height:200px;margin:12px 0"/>` : ""}
  <p style="font-size:16px;margin:8px 0"><strong>${escapeHtml(item.title)}</strong></p>
  <table style="font-size:15px;border-collapse:collapse">
    <tr><td style="padding:4px 16px 4px 0;color:#555">Now</td><td><strong style="color:#15803d">${fmt(price)}</strong></td></tr>
    <tr><td style="padding:4px 16px 4px 0;color:#555">Was</td><td>${fmt(item.baselinePrice)}${drop > 0 ? ` (${drop.toFixed(0)}% off)` : ""}</td></tr>
    <tr><td style="padding:4px 16px 4px 0;color:#555">Your target</td><td>${fmt(item.targetPrice)}</td></tr>
  </table>
  <p style="margin:20px 0">
    <a href="${escapeHtml(item.url)}" style="background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">View in shop</a>
    &nbsp; <a href="${appUrl}/items/${item.id}" style="color:#555">Open in Price Tracker</a>
  </p>
</div>`;
  const text = `${item.title} is now ${fmt(price)} (was ${fmt(item.baselinePrice)}, target ${fmt(item.targetPrice)}).\n${item.url}`;
  return { subject, html, text };
}

/** Send a price alert. Falls back to logging when RESEND_API_KEY is not configured. */
export async function sendPriceAlert(item: AlertItem, price: number): Promise<void> {
  const { subject, html, text } = buildAlertEmail(item, price);
  const to = process.env.ALERT_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || !to) {
    console.log(`[email] RESEND_API_KEY/ALERT_EMAIL not set — would have sent:\n  To: ${to ?? "(unset)"}\n  Subject: ${subject}\n  ${text}`);
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Price Tracker <onboarding@resend.dev>",
    to,
    subject,
    html,
    text,
  });
  if (error) throw new Error(`Email failed: ${error.message}`);
}
