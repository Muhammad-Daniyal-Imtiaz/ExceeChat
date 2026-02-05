// components/VisualResult.tsx
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface Props {
    type: 'chart' | 'table' | 'text';
    data?: any[];
    config?: {
        type: 'bar' | 'line' | 'pie';
        xKey: string;
        yKeys: string[];
    };
    title?: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function VisualResult({ type, data, config, title }: Props) {
    if (!data || data.length === 0) return null;

    return (
        <div className="mt-4 p-4 border rounded-xl bg-white shadow-sm overflow-hidden anim-fade-in">
            {title && <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>}

            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {config?.type === 'bar' ? (
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey={config.xKey} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Bar dataKey={config.yKeys[0]} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    ) : config?.type === 'line' ? (
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey={config.xKey} tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey={config.yKeys[0]} stroke="#3b82f6" strokeWidth={2} />
                        </LineChart>
                    ) : (
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    )}
                </ResponsiveContainer>
            </div>

            {/* Legend or Summary could go here */}
        </div>
    );
}
