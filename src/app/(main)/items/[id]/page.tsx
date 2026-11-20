import { notFound } from "next/navigation";
import { Suspense } from "react";
import { checkOne, deleteItem, toggleStatus } from "@/app/actions";
import { ActionButton } from "@/components/action-button";
import { EditItemForm, ManualPriceForm } from "@/components/item-forms";
import { PriceChart } from "@/components/price-chart";
import { SubmitButton } from "@/components/submit-button";
import { prisma } from "@/lib/db";
import { formatMoney, percentDrop } from "@/lib/price";

export default function ItemPage({ params }: PageProps<"/items/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <ItemDetails params={params} />
    </Suspense>
  );
}

async function ItemDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.item.findUnique({
    where: { id },
    include: { pricePoints: { orderBy: { checkedAt: "asc" } } },
  });
  if (!item) notFound();

  const current = item.currentPrice ?? item.baselinePrice;
  const fmt = (n: number | null) => formatMoney(n, item.currency);
  const toGo = current - item.targetPrice;
  const change = percentDrop(item.baselinePrice, current);
  const changeLabel =
    Math.abs(change) < 0.5 ? undefined : `${Math.abs(change).toFixed(0)}% ${change > 0 ? "below" : "above"} original`;
  const stat = (label: string, value: React.ReactNode, sub?: React.ReactNode) => (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex gap-5">
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="h-28 w-28 shrink-0 rounded-md bg-white object-contain" />
        )}
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-semibold leading-tight">{item.title}</h1>
          <a href={item.url} target="_blank" rel="noreferrer" className="block truncate text-sm text-emerald-700 hover:underline dark:text-emerald-400">
            {item.url}
          </a>
          <p className="text-xs text-zinc-500">
            {item.status === "PAUSED" ? "Paused · " : ""}
            {item.lastCheckedAt ? `Last checked ${item.lastCheckedAt.toLocaleString()}` : "Not checked yet"}
            {item.alerted && " · Alert sent for this drop"}
          </p>
        </div>
      </div>

      {item.lastError && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">
          Last check failed: {item.lastError}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stat("Current", fmt(current), changeLabel)}
        {stat("Target", fmt(item.targetPrice), item.targetType === "PERCENT" ? `${item.targetValue}% off ${fmt(item.baselinePrice)}` : "fixed price")}
        {stat("Lowest seen", fmt(item.lowestPrice))}
        {stat("To go", toGo > 0 ? fmt(toGo) : "🎯 Hit!", toGo > 0 ? `${((toGo / current) * 100).toFixed(0)}% more drop needed` : undefined)}
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Price history</h2>
          <ActionButton action={checkOne.bind(null, item.id)} pendingLabel="Checking…">
            Check now
          </ActionButton>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <PriceChart
            points={item.pricePoints.map((p) => ({ checkedAt: p.checkedAt.toISOString(), price: p.price }))}
            targetPrice={item.targetPrice}
            currency={item.currency}
          />
        </div>
        <div className="text-sm">
          <p className="mb-2 text-zinc-600 dark:text-zinc-400">Saw a price the scraper can&apos;t? Record it manually:</p>
          <ManualPriceForm id={item.id} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Alert settings</h2>
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <EditItemForm item={item} />
        </div>
      </section>

      <section className="flex flex-wrap gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <form action={toggleStatus.bind(null, item.id)}>
          <SubmitButton variant="secondary">{item.status === "ACTIVE" ? "Pause tracking" : "Resume tracking"}</SubmitButton>
        </form>
        <form action={deleteItem.bind(null, item.id)}>
          <SubmitButton variant="danger">Delete</SubmitButton>
        </form>
      </section>
    </div>
  );
}
