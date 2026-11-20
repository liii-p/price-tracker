"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkAllItems, checkItem, recordPrice, reevaluateCurrent } from "@/lib/checker";
import { computeTargetPrice, parsePrice } from "@/lib/price";
import { ScrapeError, scrapeProduct, validateUrl } from "@/lib/scraper";

export type FormState = { error?: string; message?: string };

// ---------- items ----------

export type Preview = {
  url: string;
  title: string | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
  error?: string;
};

export async function previewProduct(_: Preview | null, formData: FormData): Promise<Preview> {
  const url = String(formData.get("url") ?? "").trim();
  try {
    validateUrl(url);
    const p = await scrapeProduct(url);
    return { url, title: p.title, price: p.price, currency: p.currency, imageUrl: p.imageUrl };
  } catch (err) {
    const error = err instanceof ScrapeError ? err.message : `Unexpected error: ${(err as Error).message}`;
    return { url, title: null, price: null, currency: null, imageUrl: null, error };
  }
}

const priceField = z.preprocess((v) => parsePrice(String(v ?? "")), z.number().positive("Enter a price above 0"));

const targetSchema = z
  .object({
    targetType: z.enum(["PERCENT", "PRICE"]),
    targetValue: priceField,
    baselinePrice: priceField,
  })
  .refine((d) => d.targetType !== "PERCENT" || d.targetValue < 100, {
    message: "A percentage discount must be below 100%",
    path: ["targetValue"],
  });

const itemSchema = z
  .object({
    url: z.string().trim().url("Enter a valid URL"),
    title: z.string().trim().min(1, "Give the item a name").max(300),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .transform((v) => v || null)
      .pipe(z.string().regex(/^[A-Z]{3}$/, "Currency must be a 3-letter code like AUD").nullable()),
    imageUrl: z
      .string()
      .trim()
      .transform((v) => v || null)
      .pipe(z.string().url().nullable()),
  })
  .and(targetSchema);

function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}

/** Resolves the "25% / 50% / custom %" radio choices into targetType/targetValue. */
function targetFields(formData: FormData) {
  const choice = String(formData.get("targetChoice") ?? "");
  if (choice === "25" || choice === "50") return { targetType: "PERCENT", targetValue: choice };
  if (choice === "percent") return { targetType: "PERCENT", targetValue: formData.get("customPercent") };
  return { targetType: "PRICE", targetValue: formData.get("targetPrice") };
}

export async function createItem(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = itemSchema.safeParse({
    url: formData.get("url"),
    title: formData.get("title"),
    currency: formData.get("currency") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    baselinePrice: formData.get("baselinePrice"),
    ...targetFields(formData),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;

  const item = await prisma.item.create({
    data: {
      url: d.url,
      title: d.title,
      currency: d.currency,
      imageUrl: d.imageUrl,
      baselinePrice: d.baselinePrice,
      targetType: d.targetType,
      targetValue: d.targetValue,
      targetPrice: computeTargetPrice(d.targetType, d.targetValue, d.baselinePrice),
    },
  });
  // The price the user saw counts as the first observation (and alerts if it already meets the target).
  await recordPrice(item, d.baselinePrice);
  revalidatePath("/");
  redirect(`/items/${item.id}`);
}

export async function updateItem(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Give the item a name" };
  const parsed = targetSchema.safeParse({ baselinePrice: formData.get("baselinePrice"), ...targetFields(formData) });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;

  const item = await prisma.item.update({
    where: { id },
    data: {
      title,
      baselinePrice: d.baselinePrice,
      targetType: d.targetType,
      targetValue: d.targetValue,
      targetPrice: computeTargetPrice(d.targetType, d.targetValue, d.baselinePrice),
      alerted: false, // new target → allow a fresh alert
    },
  });
  await reevaluateCurrent(item);
  revalidatePath(`/items/${id}`);
  revalidatePath("/");
  return { message: "Saved." };
}

export async function recordManualPrice(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const price = parsePrice(String(formData.get("price") ?? ""));
  if (price == null || price <= 0) return { error: "Enter a valid price" };
  const item = await prisma.item.findUniqueOrThrow({ where: { id } });
  const result = await recordPrice(item, price);
  revalidatePath(`/items/${id}`);
  revalidatePath("/");
  return result.error ? { error: result.error } : { message: result.alerted ? "Recorded — alert sent!" : "Recorded." };
}

export async function toggleStatus(id: string) {
  const item = await prisma.item.findUniqueOrThrow({ where: { id } });
  await prisma.item.update({ where: { id }, data: { status: item.status === "ACTIVE" ? "PAUSED" : "ACTIVE" } });
  revalidatePath(`/items/${id}`);
  revalidatePath("/");
}

export async function deleteItem(id: string) {
  await prisma.item.delete({ where: { id } });
  revalidatePath("/");
  redirect("/");
}

export async function checkOne(id: string): Promise<FormState> {
  const item = await prisma.item.findUniqueOrThrow({ where: { id } });
  const result = await checkItem(item);
  revalidatePath(`/items/${id}`);
  revalidatePath("/");
  if (result.error) return { error: result.error };
  return { message: result.alerted ? "Price checked — alert sent!" : "Price checked." };
}

export async function checkAll(): Promise<FormState> {
  const { skipped, results } = await checkAllItems();
  revalidatePath("/");
  if (skipped) return { message: "A check is already running." };
  const errors = results.filter((r) => r.error).length;
  const alerts = results.filter((r) => r.alerted).length;
  return {
    message: `Checked ${results.length} item${results.length === 1 ? "" : "s"}${alerts ? `, ${alerts} alert${alerts === 1 ? "" : "s"} sent` : ""}${errors ? `, ${errors} failed` : ""}.`,
  };
}
