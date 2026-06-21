import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TrendChartProps {
  data: { month: string; savings: number; }[];
}

export const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center' }}>No trend data available yet.</div>;
  }

  return (
    <div style={{ width: '100%', height: 300, marginTop: '1.5rem', background: 'var(--bg-glass)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
          <XAxis dataKey="month" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} />
          <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }}
            itemStyle={{ color: '#10b981' }}
          />
          <Line type="monotone" dataKey="savings" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
