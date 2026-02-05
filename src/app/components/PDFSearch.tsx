// components/PDFSearch.tsx
'use client';

import { useState } from 'react';
import EmbeddingEngine from '../utils/embeddingEngine';
import { PDFProcessor, PDFChunk } from '../utils/pdfProcessor';

interface ChunkWithVector extends PDFChunk {
    _vector: number[];
}

export function PDFSearch() {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [chunks, setChunks] = useState<ChunkWithVector[]>([]);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Array<{ text: string, score: number, metadata?: any }>>([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || file.type !== 'application/pdf') return;

        setPdfFile(file);
        setProcessing(true);
        setProgress(0);
        setChunks([]);

        try {
            const text = await PDFProcessor.extractTextFromPDF(file);
            const rawChunks = PDFProcessor.chunkText(text);

            await EmbeddingEngine.getInstance((p) => setProgress(p));

            const chunksWithVectors = await Promise.all(
                rawChunks.map(async (chunk) => {
                    const vector = await EmbeddingEngine.embed(chunk.text);
                    return { ...chunk, _vector: vector };
                })
            );

            setChunks(chunksWithVectors);
        } catch (error) {
            console.error('PDF processing failed:', error);
        } finally {
            setProcessing(false);
        }
    };

    const handleSearch = async () => {
        if (!query.trim() || chunks.length === 0) return;

        setLoading(true);
        setResults([]);

        try {
            const queryVector = await EmbeddingEngine.embed(query);
            const scoredResults = chunks.map((chunk) => {
                const score = EmbeddingEngine.cosineSimilarity(queryVector, chunk._vector);
                return {
                    text: chunk.text,
                    score: score,
                    metadata: chunk.metadata
                };
            });

            const topResults = scoredResults
                .sort((a, b) => b.score - a.score)
                .filter(r => r.score > 0.3)
                .slice(0, 5);

            setResults(topResults);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto anim-slide-up">
            {/* Upload Area */}
            <div className={`p-10 border-2 border-dashed rounded-[32px] transition-all duration-500 bg-white shadow-xl shadow-red-50/50 ${processing ? 'border-red-400' : 'border-gray-200 hover:border-red-400'
                }`}>
                <div className="flex flex-col items-center justify-center">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-500 ${processing ? 'bg-red-500 text-white animate-pulse' : 'bg-red-50 text-red-600'
                        }`}>
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>

                    {!processing ? (
                        <>
                            <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Deep PDF Research</h2>
                            <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest text-center">AI extracts and indexes every sentence for instant semantic search</p>

                            <label className="mt-8 px-8 py-3 bg-red-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest cursor-pointer hover:bg-red-700 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-200">
                                Select Document
                                <input type="file" accept=".pdf" className="hidden" onChange={handlePDFUpload} />
                            </label>
                        </>
                    ) : (
                        <div className="w-full max-w-xs space-y-4">
                            <div className="flex justify-between items-end">
                                <span className="text-[11px] font-black text-red-600 uppercase tracking-widest animate-pulse">Building Index</span>
                                <span className="text-[14px] font-bold text-gray-800">{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div className="bg-red-600 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Search Section */}
            {(chunks.length > 0 || loading) && (
                <div className="space-y-6 anim-fade-in">
                    <div className="relative flex items-center shadow-2xl shadow-red-100/50 rounded-3xl overflow-hidden border border-red-50 focus-within:ring-4 focus-within:ring-red-100 transition-all duration-500">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Ask any question about the document..."
                            className="flex-1 bg-white px-8 py-5 text-base font-medium placeholder:text-gray-300 focus:outline-none"
                        />
                        <button
                            onClick={handleSearch}
                            disabled={loading}
                            className="bg-red-600 text-white px-10 py-5 font-black uppercase tracking-widest text-xs hover:bg-black transition-all active:scale-95 disabled:bg-gray-100 disabled:text-gray-300"
                        >
                            {loading ? 'Searching...' : 'Explore'}
                        </button>
                    </div>

                    {/* Results Container */}
                    <div className="space-y-4">
                        {results.map((res, i) => (
                            <div key={i} className="p-8 bg-white border border-gray-100 rounded-[32px] shadow-sm hover:shadow-xl transition-all duration-500 group anim-slide-up">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="w-8 h-1 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                                        <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Match Score {(res.score * 100).toFixed(1)}%</span>
                                    </div>
                                    <span className="px-3 py-1 bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest rounded-lg">Page {res.metadata?.pageNumber || 'Unknown'}</span>
                                </div>
                                <p className="text-gray-800 font-medium leading-[1.8] text-lg select-text">
                                    "{res.text}"
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}