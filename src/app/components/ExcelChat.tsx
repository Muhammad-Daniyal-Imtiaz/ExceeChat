// components/ExcelChat.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { db, Dataset } from '../utils/db';
import { QueryResult } from '../utils/smartQuery';

type Props = {
    datasetId: string | null;
};

export function ExcelChat({ datasetId }: Props) {
    const [dataset, setDataset] = useState<Dataset | null>(null);
    const [question, setQuestion] = useState('');
    const [result, setResult] = useState<QueryResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [availableColumns, setAvailableColumns] = useState<string[]>([]);
    const queryEngine = useRef<any>(null);

    useEffect(() => {
        // Lazy load the query engine
        const loadEngine = async () => {
            const { SmartQueryEngine } = await import('../utils/smartQuery');
            queryEngine.current = new SmartQueryEngine();
        };
        loadEngine();
    }, []);

    useEffect(() => {
        const loadDataset = async () => {
            console.log('ExcelChat: Loading datasetId:', datasetId);
            if (!datasetId) {
                setDataset(null);
                setResult(null);
                return;
            }
            try {
                const d = await db.datasets.get(datasetId);
                console.log('ExcelChat: Loaded dataset:', d);

                if (d) {
                    setDataset(d);
                    // Extract column names for suggestions
                    if (d.rows && d.rows.length > 0) {
                        const columns = Object.keys(d.rows[0]);
                        setAvailableColumns(columns);
                    }
                } else {
                    console.error('ExcelChat: Dataset not found in DB');
                    setDataset(null);
                }
                setResult(null);
            } catch (err) {
                console.error('ExcelChat: Error loading dataset:', err);
                setDataset(null);
            }
        };
        loadDataset();
    }, [datasetId]);

    const handleAsk = async () => {
        if (!dataset || !question.trim() || !queryEngine.current) return;

        setLoading(true);
        setProgress(0);
        setResult(null);

        try {
            const answer = await queryEngine.current.runQuery(
                dataset.rows,
                question,
                (p: number) => setProgress(p)
            );
            setResult(answer);
        } catch (err) {
            console.error(err);
            setResult({ message: 'Error running query. Please try a different question.' });
        } finally {
            setLoading(false);
            setProgress(0);
        }
    };

    if (!dataset) {
        return (
            <div className="p-4 border rounded text-sm text-gray-500">
                Select a dataset to start chatting.
            </div>
        );
    }

    return (
        <div className="p-4 border rounded space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Chat with: {dataset.name}</h2>
                <span className="text-sm text-gray-500">{dataset.rowCount} rows, {availableColumns.length} columns</span>
            </div>

            {/* Query Input */}
            <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                    <input
                        className="border px-3 py-2 flex-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Ask anything about your data... (e.g., "sum of sales", "filter by status", "top 10")`}
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
                        disabled={loading}
                    />
                    <button
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50 min-w-24 relative overflow-hidden"
                        onClick={handleAsk}
                        disabled={loading || !question.trim()}
                    >
                        <span className="relative z-10">{loading ? (progress > 0 && progress < 100 ? `${Math.round(progress)}%` : '...') : 'Ask'}</span>
                        {loading && progress > 0 && (
                            <div
                                className="absolute left-0 top-0 bottom-0 bg-blue-500 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        )}
                    </button>
                </div>
                {loading && progress > 0 && progress < 100 && (
                    <div className="text-xs text-blue-600 flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        Downloading AI model... this only happens once.
                    </div>
                )}
            </div>

            {/* Results Display */}
            {result && (
                <div className="mt-4">
                    {Array.isArray(result) ? (
                        <div>
                            <div className="text-sm text-gray-600 mb-2">
                                Found {result.length} result{result.length !== 1 ? 's' : ''}
                            </div>
                            <div className="overflow-auto border rounded max-h-96">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            {Object.keys(result[0] ?? {}).map((col) => (
                                                <th key={col} className="px-3 py-2 border-b font-semibold">
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                {Object.values(row).map((v, i) => (
                                                    <td key={i} className="px-3 py-2 border-b">
                                                        {String(v ?? '')}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : 'summary' in result ? (
                        <div className="bg-gray-50 p-4 rounded">
                            <h3 className="font-semibold mb-3 text-lg">📊 Data Summary</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <span className="font-medium">Total Rows:</span>
                                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                            {result.summary.total_rows}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="font-medium">Columns:</span>
                                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                                            {result.summary.columns}
                                        </span>
                                    </div>
                                    <div className="mt-3">
                                        <div className="font-medium mb-2">Column Names:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {result.summary.column_names.map((col: string) => (
                                                <span key={col} className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs">
                                                    {col}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="font-medium mb-2">Column Statistics:</div>
                                    {Object.entries(result.summary)
                                        .filter(([key]) => !['total_rows', 'columns', 'column_names'].includes(key))
                                        .slice(0, 4)
                                        .map(([col, stats]: [string, any]) => (
                                            <div key={col} className="border-l-4 border-blue-500 pl-3 py-2 bg-white rounded shadow-sm">
                                                <div className="font-medium text-sm">{col}</div>
                                                <div className="text-xs text-gray-600 mt-1">
                                                    Type: {stats.type} | Unique: {stats.unique}
                                                    {stats.type === 'numeric' && (
                                                        <div className="mt-1 grid grid-cols-3 gap-1">
                                                            <span className="bg-blue-50 px-1 rounded">Min: {stats.min}</span>
                                                            <span className="bg-green-50 px-1 rounded">Max: {stats.max}</span>
                                                            <span className="bg-purple-50 px-1 rounded">Avg: {stats.average}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    ) : 'message' in result && typeof result.message === 'string' ? (
                        <div className={`p-4 rounded ${result.message.includes('No results')
                            ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                            : 'bg-blue-50 border border-blue-200 text-blue-800'
                            }`}>
                            <div className="flex items-center">
                                <span className="mr-2">{result.message.includes('No results') ? '⚠️' : '💡'}</span>
                                <span>{result.message}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-blue-50 p-4 rounded border border-blue-200">
                            <h3 className="font-semibold mb-2 text-blue-800">📈 Calculation Result</h3>
                            {Object.entries(result).map(([key, value]) => (
                                <div key={key} className="flex justify-between items-center py-2 border-b border-blue-100 last:border-0">
                                    <span className="font-medium text-blue-700">
                                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                                    </span>
                                    <span className="text-lg font-bold text-blue-900">
                                        {typeof value === 'number' ?
                                            (Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2)) :
                                            value
                                        }
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}