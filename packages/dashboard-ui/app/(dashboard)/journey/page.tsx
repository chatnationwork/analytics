'use client';

import { useState } from 'react';
import { Search, User, Phone, Mail, Calendar } from 'lucide-react';

interface JourneyEvent {
  time: string;
  type: 'whatsapp' | 'web';
  icon: string;
  event: string;
  details: string;
}

export default function JourneyPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Mock user data - would come from API
  const mockUser = {
    name: 'John Doe',
    phone: '+254712345678',
    email: 'john@example.com',
    firstSeen: '2026-01-15',
    lastSeen: '2026-01-20',
    totalSessions: 5,
    totalEvents: 47,
  };

  const mockEvents: JourneyEvent[] = [
    { time: '10:00:00', type: 'whatsapp', icon: '📱', event: 'message.received', details: 'User sent: "Hi, I need help with tax filing"' },
    { time: '10:00:15', type: 'whatsapp', icon: '🤖', event: 'message.sent', details: 'Auto-reply: Welcome message + link' },
    { time: '10:00:32', type: 'whatsapp', icon: '👁️', event: 'message.read', details: 'User read the message' },
    { time: '10:01:05', type: 'web', icon: '🌐', event: 'page_view', details: '/mri/validation' },
    { time: '10:01:45', type: 'web', icon: '📝', event: 'validation_success', details: 'ID: A012345678X verified' },
    { time: '10:02:30', type: 'web', icon: '🔐', event: 'otp_verified', details: 'Phone: +254712345678' },
    { time: '10:05:12', type: 'web', icon: '📄', event: 'return_filed', details: 'Receipt: MRI-2026-001234' },
    { time: '10:05:45', type: 'web', icon: '💳', event: 'payment_initiated', details: 'Amount: KES 500' },
    { time: '10:06:23', type: 'web', icon: '✅', event: 'payment_success', details: 'Transaction complete' },
  ];

  const handleSearch = () => {
    if (searchQuery) {
      setSelectedUser(mockUser);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">User Journey</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track complete user journeys across web and WhatsApp</p>
      </div>

      {/* Search */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by phone number, email, or user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* No selection state */}
      {!selectedUser && (
        <div className="bg-card rounded-xl border border-border p-12 text-center shadow-sm">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-lg font-medium text-foreground mb-2">Search for a User</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Enter a phone number, email, or user ID to see their complete journey across all channels.
          </p>
        </div>
      )}

      {/* User Card & Timeline */}
      {selectedUser && (
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          {/* User Header */}
          <div className="flex items-start gap-4 mb-6 pb-6 border-b border-border">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-xl text-white">
              {selectedUser.name.split(' ').map((n: string) => n[0]).join('')}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-lg text-foreground">{selectedUser.name}</div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {selectedUser.phone}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {selectedUser.email}
                </span>
              </div>
            </div>
            <div className="text-right text-sm">
              <div className="text-muted-foreground">First seen</div>
              <div className="text-foreground font-medium">{selectedUser.firstSeen}</div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-border">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{selectedUser.totalSessions}</div>
              <div className="text-xs text-muted-foreground">Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{selectedUser.totalEvents}</div>
              <div className="text-xs text-muted-foreground">Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{selectedUser.lastSeen}</div>
              <div className="text-xs text-muted-foreground">Last Seen</div>
            </div>
          </div>

          {/* Channel Legend */}
          <div className="flex items-center gap-6 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">WhatsApp</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Web</span>
            </div>
          </div>

          {/* Timeline */}
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-4">
              {mockEvents.map((event, i) => (
                <div key={i} className="flex items-start gap-4 relative">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg relative z-10 ${
                    event.type === 'whatsapp' ? 'bg-green-500/10' : 'bg-blue-500/10'
                  }`}>
                    {event.icon}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">{event.event}</span>
                      <span className="text-xs text-muted-foreground">{event.time}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        event.type === 'whatsapp' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        {event.type}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">{event.details}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
