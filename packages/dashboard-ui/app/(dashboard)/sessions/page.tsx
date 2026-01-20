export default function SessionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Sessions</h1>
        <p className="text-sm text-gray-400 mt-0.5">Browse and explore user sessions</p>
      </div>

      <div className="bg-gray-800/50 rounded-xl border border-white/10 p-8 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h2 className="text-lg font-medium text-white mb-2">Sessions Explorer</h2>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          Search for sessions by user ID, anonymous ID, or time range. 
          View complete event timelines for any session.
        </p>
        <p className="text-gray-500 text-xs mt-4">Coming soon</p>
      </div>
    </div>
  );
}
