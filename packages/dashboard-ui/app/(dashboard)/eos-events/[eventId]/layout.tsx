import { EventSidebar } from "@/components/eos-events/EventSidebar";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return (
    <div className="flex flex-col md:flex-row gap-8">
      <EventSidebar eventId={eventId} />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
