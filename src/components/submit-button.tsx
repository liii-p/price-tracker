"use client";

export function SubmitButton({
  children,
  pending,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pending?: boolean; variant?: "primary" | "secondary" | "danger" }) {
  const styles = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700",
    secondary:
      "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
    danger: "border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40",
  }[variant];
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
