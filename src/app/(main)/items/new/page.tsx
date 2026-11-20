import { NewItemForm } from "@/components/new-item-form";

export default function NewItemPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Track a new item</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Paste a link to the product page. We&apos;ll read the current price, then you choose how low it needs to go.
      </p>
      <NewItemForm />
    </div>
  );
}
