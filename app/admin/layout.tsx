"use client";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="space-y-4">{children}</section>
    </main>
  );
}
