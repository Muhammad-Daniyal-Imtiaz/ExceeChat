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
        <div className="p-4 border rounded space-y-2">
            <h2 className="text-lg font-semibold">Your Datasets (IndexedDB)</h2>
            {datasets.length === 0 && <p className="text-sm text-gray-500">No datasets yet.</p>}
            <ul className="space-y-1">
                {datasets.map((d) => (
                    <li
                        key={d.id}
                        className={`cursor-pointer p-2 rounded border transition-colors ${
                            selectedId === d.id 
                                ? 'bg-blue-100 border-blue-500 text-blue-900 shadow-sm' 
                                : 'hover:bg-gray-50 border-gray-200'
                        }`}
                        onClick={() => {
                            console.log('Selected dataset:', d.id);
                            if (d.id) onSelect(d.id);
                        }}
                    >
                        <div className="font-medium flex justify-between items-center">
                            <span>{d.name}</span>
                            {selectedId === d.id && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Active</span>}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            {d.rowCount} rows • {new Date(d.createdAt).toLocaleString()}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}