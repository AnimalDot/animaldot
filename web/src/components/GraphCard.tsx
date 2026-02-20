import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

interface GraphCardProps {
  title: string;
  data: Array<{ time: string; value: number }>;
  color: string;
  unit: string;
}

export default function GraphCard({ title, data, color, unit }: GraphCardProps) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="mb-4">
        <h3 className="text-[#1F1F1F] mb-1">{title}</h3>
        <p className="text-[#1F1F1F]/40">{unit}</p>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis dataKey="time" stroke="#1F1F1F40" tick={{ fontSize: 12 }} />
          <YAxis stroke="#1F1F1F40" tick={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}