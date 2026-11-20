"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions";
import { SubmitButton } from "./submit-button";

/** A button that runs a server action and shows its result message inline. */
export function ActionButton({
  action,
  children,
  pendingLabel,
  variant = "secondary",
}: {
  action: () => Promise<FormState>;
  children: React.ReactNode;
  pendingLabel: string;
  variant?: "primary" | "secondary";
}) {
  const [state, run, pending] = useActionState<FormState>(action, {});
  return (
    <form action={run} className="flex flex-wrap items-center gap-3">
      <SubmitButton pending={pending} variant={variant}>
        {pending ? pendingLabel : children}
      </SubmitButton>
      {!pending && state.message && <span className="text-sm text-zinc-600 dark:text-zinc-400">{state.message}</span>}
      {!pending && state.error && <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span>}
    </form>
  );
}
