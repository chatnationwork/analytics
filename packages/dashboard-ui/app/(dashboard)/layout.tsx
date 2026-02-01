import { TopNav } from "@/components/TopNav";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background flex">
      <TopNav />
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
