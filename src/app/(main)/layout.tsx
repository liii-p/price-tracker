import Link from "next/link";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16">
      <header className="flex items-center justify-between gap-4 py-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          💸 Price Tracker
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/items/new" className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700">
            + Add item
          </Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
