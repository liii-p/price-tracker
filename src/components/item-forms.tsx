"use client";

import { useActionState, useState } from "react";
import { recordManualPrice, updateItem, type FormState } from "@/app/actions";
import { TargetPicker, initialChoice, inputCls } from "./target-picker";
import { SubmitButton } from "./submit-button";

export function EditItemForm({
  item,
}: {
  item: { id: string; title: string; baselinePrice: number; currency: string | null; targetType: string; targetValue: number };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateItem.bind(null, item.id), {});
  const [baseline, setBaseline] = useState(String(item.baselinePrice));
  const choice = initialChoice(item.targetType, item.targetValue);

  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Name</span>
        <input name="title" required defaultValue={item.title} className={`${inputCls} w-full`} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Original price (percent targets are based on this)</span>
        <input
          name="baselinePrice"
          inputMode="decimal"
          value={baseline}
          onChange={(e) => setBaseline(e.target.value)}
          className={`${inputCls} w-40`}
        />
      </label>
      <TargetPicker baselinePrice={baseline} currency={item.currency} defaultChoice={choice} defaultValue={item.targetValue} />
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending}>{pending ? "Saving…" : "Save changes"}</SubmitButton>
        {state.message && <span className="text-sm text-emerald-700 dark:text-emerald-400">{state.message}</span>}
        {state.error && <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span>}
      </div>
    </form>
  );
}

export function ManualPriceForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(recordManualPrice.bind(null, id), {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input name="price" inputMode="decimal" required placeholder="Price you saw" className={`${inputCls} w-36`} />
      <SubmitButton pending={pending} variant="secondary">
        Record
      </SubmitButton>
      {state.message && <span className="text-sm text-emerald-700 dark:text-emerald-400">{state.message}</span>}
      {state.error && <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span>}
    </form>
  );
}
