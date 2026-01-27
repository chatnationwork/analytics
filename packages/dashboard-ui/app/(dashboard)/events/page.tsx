export default function EventsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Events</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Real-time event stream</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-8 text-center shadow-sm">
        <div className="text-4xl mb-4">⚡</div>
        <h2 className="text-lg font-medium text-foreground mb-2">Live Event Stream</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Watch events as they flow in real-time. Filter by event type, 
          user, or session to debug and analyze behavior.
        </p>
        <p className="text-muted-foreground/70 text-xs mt-4">Coming soon</p>
      </div>
    </div>
  );
}
