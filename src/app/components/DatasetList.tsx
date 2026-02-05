// components/DatasetList.tsx
'use client';

import { useEffect, useState } from 'react';
import { db, Dataset } from '../utils/db';

type Props = {
    onSelect: (datasetId: string) => void;
    refreshKey?: number;
    selectedId?: string | null;
};

export function DatasetList({ onSelect, refreshKey = 0, selectedId }: Props) {
    const [datasets, setDatasets] = useState<Dataset[]>([]);

    useEffect(() => {
        const load = async () => {
            const all = await db.datasets.orderBy('createdAt').reverse().toArray();
            setDatasets(all);
        };
        load();
    }, [refreshKey]);

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b bg-gray-50/50">
                <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">Workspace Datasets</h2>
                <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">Persistent Local Storage</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {datasets.length === 0 ? (
                    <div className="py-12 text-center">
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <svg className="w-6 h-6 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">No Datasets Uploaded</p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {datasets.map((d) => (
                            <li
                                key={d.id}
                                className={`group cursor-pointer p-4 rounded-2xl border transition-all duration-300 ${selectedId === d.id
                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 scale-[1.02]'
                                        : 'bg-white border-gray-100 hover:border-indigo-200 hover:shadow-md'
                                    }`}
                                onClick={() => {
                                    if (d.id) onSelect(d.id);
                                }}
                            >
                                <div className="flex justify-between items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`text-sm font-bold truncate ${selectedId === d.id ? 'text-white' : 'text-gray-800'}`}>
                                            {d.name}
                                        </h3>
                                        <div className={`text-[10px] font-bold mt-1 uppercase tracking-tighter ${selectedId === d.id ? 'text-indigo-100' : 'text-gray-400'}`}>
                                            {d.rowCount} entries • {new Date(d.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    {selectedId === d.id && (
                                        <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center anim-fade-in">
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="p-4 bg-indigo-50/30 border-t border-gray-100">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Cloud Sync Disabled (Local Only)</p>
                </div>
            </div>
        </div>
    );
}