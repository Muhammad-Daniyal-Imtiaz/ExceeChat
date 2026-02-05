'use client';

import { useEffect, useState } from 'react';
import { db, Dataset } from '../utils/db';

type Props = {
    onSelect: (datasetId: string) => void;
    refreshKey?: number; // Add this prop
};

export function DatasetList({ onSelect, refreshKey = 0 }: Props) {
    const [datasets, setDatasets] = useState<Dataset[]>([]);

    useEffect(() => {
        const load = async () => {
            const all = await db.datasets.orderBy('createdAt').reverse().toArray();
            setDatasets(all);
        };
        load();
    }, [refreshKey]); // <--- THIS IS THE FIX: Reload whenever refreshKey changes

    return (
        <div className="p-4 border rounded space-y-2">
            <h2 className="text-lg font-semibold">Your Datasets (IndexedDB)</h2>
            {datasets.length === 0 && <p className="text-sm text-gray-500">No datasets yet.</p>}
            <ul className="space-y-1">
                {datasets.map((d) => (
                    <li
                        key={d.id}
                        className="cursor-pointer hover:bg-blue-50 p-2 rounded border"
                        onClick={() => d.id && onSelect(d.id)}
                    >
                        <div className="font-medium">{d.name}</div>
                        <div className="text-xs text-gray-500">
                            {d.rowCount} rows • {new Date(d.createdAt).toLocaleString()}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}