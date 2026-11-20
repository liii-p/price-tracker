"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/price";

export function PriceChart({
  points,
  targetPrice,
  currency,
}: {
  points: { checkedAt: string; price: number }[];
  targetPrice: number;
  currency: string | null;
}) {
  const data = points.map((p) => ({ t: new Date(p.checkedAt).getTime(), price: p.price }));
  const prices = data.map((d) => d.price);
  const min = Math.min(targetPrice, ...prices);
  const max = Math.max(targetPrice, ...prices);
  const pad = (max - min) * 0.1 || max * 0.1 || 1;

  return (
    <div className="h-64 w-full text-zinc-500">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.15} vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
            stroke="currentColor"
            fontSize={12}
          />
          <YAxis
            domain={[Math.max(0, min - pad), max + pad]}
            tickFormatter={(v) => formatMoney(v, currency)}
            stroke="currentColor"
            fontSize={12}
            width={80}
          />
          <Tooltip
            labelFormatter={(t) => new Date(t as number).toLocaleString()}
            formatter={(v) => [formatMoney(v as number, currency), "Price"]}
            contentStyle={{ fontSize: 12 }}
          />
          <ReferenceLine
            y={targetPrice}
            stroke="#16a34a"
            strokeDasharray="4 4"
            label={{ value: "Target", position: "insideTopRight", fill: "#16a34a", fontSize: 12 }}
          />
          <Line type="stepAfter" dataKey="price" stroke="#2563eb" strokeWidth={2} dot={data.length < 30} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
