'use client';

import { useEffect, useState } from 'react';
import { db, Dataset } from '../utils/db';
import semanticSearch from '../utils/embeddingSearch'; // Import the Search Function

type Props = {
    datasetId: string | null;
};

export function ExcelChat({ datasetId }: Props) {
    const [dataset, setDataset] = useState<Dataset | null>(null);
    const [question, setQuestion] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingModel, setLoadingModel] = useState(false);

    useEffect(() => {
        const loadDataset = async () => {
            if (!datasetId) {
                setDataset(null);
                setResults([]);
                return;
            }
            const d = await db.datasets.get(datasetId);
            setDataset(d ?? null);
            setResults([]);
        };
        loadDataset();
    }, [datasetId]);

    const handleAsk = async () => {
        if (!dataset || !question.trim()) return;

        setLoading(true);
        setLoadingModel(true);
        setError(null);

        try {
            const foundRows = await semanticSearch(dataset.rows, question, (p) => {
                console.log(`Loading Model: ${p}%`);
            });

            setResults(foundRows);
            setLoadingModel(false);
        } catch (err) {
            console.error(err);
            setError("AI failed to process question. Please try again.");
        } finally {
            setLoading(false);
            setLoadingModel(false);
        }
    };

    if (!dataset) {
        return (
            <div className="p-4 border rounded text-sm text-gray-500 bg-white">
                Select a dataset to start chatting.
            </div>
        );
    }

    return (
        <div className="p-4 border rounded space-y-4 bg-white shadow-sm">
            <div className="flex justify-between items-center border-b pb-2">
                <h2 className="text-lg font-semibold">Chat with: {dataset.name}</h2>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    AI Ready ({dataset.rowCount} rows)
                </span>
            </div>

            {/* Input Area */}
            <div className="flex gap-2">
                <input
                    className="border px-3 py-2 flex-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ask natural language questions... (e.g., 'Find companies in South St Paul')"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                    disabled={loading}
                />
                <button
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
                    onClick={handleAsk}
                    disabled={loading || !question.trim()}
                >
                    {loadingModel ? 'Loading AI...' : 'Ask'}
                </button>
            </div>

            {/* Results */}
            {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded text-sm border border-red-200">
                    {error}
                </div>
            )}

            {results.length > 0 && (
                <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">
                        Found {results.length} relevant result{results.length !== 1 ? 's' : ''}:
                    </p>
                    <div className="overflow-auto border rounded max-h-96">
                        <table className="min-w-full text-sm text-left">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    {Object.keys(results[0])
                                        .filter(k => k !== '_vector')
                                        .slice(0, 6)
                                        .map((col) => (
                                            <th key={col} className="px-3 py-2 border-b font-semibold text-xs uppercase">
                                                {col}
                                            </th>
                                        ))}
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-blue-50 border-b last:border-0">
                                        {Object.entries(row)
                                            .filter(([k]) => k !== '_vector')
                                            .slice(0, 6)
                                            .map(([k, v]) => (
                                                <td key={k} className="px-3 py-2 text-gray-800">
                                                    {String(v ?? '')}
                                                </td>
                                            ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {results.length === 0 && !loading && !error && question && (
                <div className="text-center py-8 text-gray-500 italic">
                    No relevant data found for "{question}". Try rephrasing.
                </div>
            )}
        </div>
    );
}