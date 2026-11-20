"use client";

import { useActionState, useState } from "react";
import { createItem, previewProduct, type FormState, type Preview } from "@/app/actions";
import { TargetPicker, inputCls } from "./target-picker";
import { SubmitButton } from "./submit-button";
import { formatMoney } from "@/lib/price";

export function NewItemForm() {
  const [preview, previewAction, previewPending] = useActionState<Preview | null, FormData>(previewProduct, null);

  return (
    <div className="space-y-6">
      <form action={previewAction} className="flex flex-col gap-2 sm:flex-row">
        <input
          name="url"
          type="url"
          required
          defaultValue={preview?.url}
          placeholder="Paste a product URL, e.g. https://shop.example.com/product/123"
          className={`${inputCls} flex-1`}
        />
        <SubmitButton pending={previewPending}>{previewPending ? "Fetching…" : "Fetch price"}</SubmitButton>
      </form>

      {preview && <DetailsForm key={preview.url + (preview.price ?? "")} preview={preview} />}
    </div>
  );
}

function DetailsForm({ preview }: { preview: Preview }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createItem, {});
  const [baseline, setBaseline] = useState(preview.price != null ? String(preview.price) : "");
  const [currency, setCurrency] = useState(preview.currency ?? "");

  return (
    <form action={action} className="space-y-5 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      {preview.error ? (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          {preview.error}
        </p>
      ) : (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Found it — current price {formatMoney(preview.price, preview.currency)}.
        </p>
      )}

      <input type="hidden" name="url" value={preview.url} />
      <input type="hidden" name="imageUrl" value={preview.imageUrl ?? ""} />

      <div className="flex gap-4">
        {preview.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.imageUrl} alt="" className="h-24 w-24 shrink-0 rounded-md bg-white object-contain" />
        )}
        <div className="flex-1 space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Name</span>
            <input name="title" required defaultValue={preview.title ?? ""} className={`${inputCls} w-full`} />
          </label>
          <div className="flex gap-3">
            <label className="block flex-1 text-sm">
              <span className="mb-1 block font-medium">Current price</span>
              <input
                name="baselinePrice"
                required
                inputMode="decimal"
                value={baseline}
                onChange={(e) => setBaseline(e.target.value)}
                className={`${inputCls} w-full`}
              />
            </label>
            <label className="block w-24 text-sm">
              <span className="mb-1 block font-medium">Currency</span>
              <input
                name="currency"
                maxLength={3}
                placeholder="AUD"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className={`${inputCls} w-full uppercase`}
              />
            </label>
          </div>
        </div>
      </div>

      <TargetPicker baselinePrice={baseline} currency={currency || null} />

      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <SubmitButton pending={pending}>{pending ? "Saving…" : "Start tracking"}</SubmitButton>
    </form>
  );
}
