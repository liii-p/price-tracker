import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { checkAll } from "@/app/actions";
import { ActionButton } from "@/components/action-button";
import { prisma } from "@/lib/db";
import { formatMoney, percentDrop } from "@/lib/price";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Watchlist</h1>
        <ActionButton action={checkAll} pendingLabel="Checking prices…">
          Check all now
        </ActionButton>
      </div>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
        <ItemList />
      </Suspense>
    </div>
  );
}

async function ItemList() {
  await connection();
  const items = await prisma.item.findMany({ orderBy: { createdAt: "desc" } });

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
        <p className="mb-4 text-zinc-600 dark:text-zinc-400">Nothing tracked yet.</p>
        <Link href="/items/new" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
          Add your first item →
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
      {items.map((item) => {
        const current = item.currentPrice ?? item.baselinePrice;
        const drop = percentDrop(item.baselinePrice, current);
        const hit = current <= item.targetPrice;
        return (
          <li key={item.id}>
            <Link href={`/items/${item.id}`} className="flex items-center gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded bg-white object-contain" />
              ) : (
                <div className="h-14 w-14 shrink-0 rounded bg-zinc-100 dark:bg-zinc-800" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.title}</p>
                <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-zinc-500">
                  <span>{new URL(item.url).hostname.replace(/^www\./, "")}</span>
                  {item.status === "PAUSED" && <span className="text-amber-600">Paused</span>}
                  {item.lastError && <span className="text-red-600 dark:text-red-400">Last check failed</span>}
                  {item.lastCheckedAt && <span>Checked {item.lastCheckedAt.toLocaleString()}</span>}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`font-semibold ${hit ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                  {formatMoney(current, item.currency)}
                </p>
                <p className="text-xs text-zinc-500">
                  target {formatMoney(item.targetPrice, item.currency)}
                  {drop > 0.5 && <span className="ml-1 text-emerald-600 dark:text-emerald-400">↓{drop.toFixed(0)}%</span>}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
