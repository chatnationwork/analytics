export default function EventsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Events</h1>
        <p className="text-sm text-gray-400 mt-0.5">Real-time event stream</p>
      </div>

      <div className="bg-gray-800/50 rounded-xl border border-white/10 p-8 text-center">
        <div className="text-4xl mb-4">⚡</div>
        <h2 className="text-lg font-medium text-white mb-2">Live Event Stream</h2>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          Watch events as they flow in real-time. Filter by event type, 
          user, or session to debug and analyze behavior.
        </p>
        <p className="text-gray-500 text-xs mt-4">Coming soon</p>
      </div>
    </div>
  );
}
