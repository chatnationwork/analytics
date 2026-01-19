'use client';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface WhatsappChartsProps {
    data: any[];
    funnel?: {
        sent: number;
        delivered: number;
        read: number;
        replied: number;
    };
}

export default function WhatsappCharts({ data, funnel }: WhatsappChartsProps) {
    if (funnel) {
        // Transform funnel object to array for Recharts
        const funnelData = [
            { name: 'Sent', value: funnel.sent, fill: '#3b82f6' },
            { name: 'Delivered', value: funnel.delivered, fill: '#8b5cf6' },
            { name: 'Read', value: funnel.read, fill: '#22c55e' },
            { name: 'Replied', value: funnel.replied, fill: '#f59e0b' },
        ];

        return (
            <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: 'transparent' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {/* Fill handled by data payload if not overridden here, but explicit cell mapping is safer */}
                            {/* Recharts Bar cells would go here if we wanted individual colors per bar */}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    }

    return (
        <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: 'transparent' }}
                    />
                    <Bar dataKey="sent" name="Sent" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="received" name="Received" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
