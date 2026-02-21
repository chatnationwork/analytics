import { EventNavbar } from "@/components/eos-events/EventNavbar";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return (
    <div className="flex flex-col min-h-screen">
      <EventNavbar eventId={eventId} />
      <main className="flex-1 w-full max-w-[1400px] mx-auto overflow-x-hidden no-scrollbar">
        {children}
      </main>
    </div>
  );
}
