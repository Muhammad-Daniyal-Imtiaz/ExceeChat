// components/PDFSearch.tsx
'use client';

import { useState, useRef } from 'react';
import { EmbeddingSearchEngine } from '../utils/embeddingSearch';
import { PDFProcessor, PDFChunk } from '../utils/pdfProcessor';

export function PDFSearch() {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [chunks, setChunks] = useState<PDFChunk[]>([]);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Array<{text: string, score: number}>>([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    
    const searchEngine = useRef(new EmbeddingSearchEngine());

    const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || file.type !== 'application/pdf') return;
        
        setPdfFile(file);
        setProcessing(true);
        
        try {
            // Extract text from PDF
            const text = await PDFProcessor.extractTextFromPDF(file);
            
            // Chunk the text
            const pdfChunks = PDFProcessor.chunkText(text);
            setChunks(pdfChunks);
            
            console.log(`Processed PDF into ${pdfChunks.length} chunks`);
        } catch (error) {
            console.error('PDF processing failed:', error);
            alert('Failed to process PDF');
        } finally {
            setProcessing(false);
        }
    };

    const handleSearch = async () => {
        if (!query.trim() || chunks.length === 0) return;
        
        setLoading(true);
        setResults([]);
        
        try {
            // Convert chunks to searchable documents
            const documents = chunks.map(chunk => ({
                text: chunk.text,
                metadata: chunk.metadata
            }));
            
            // Perform semantic search
            const searchResults = await searchEngine.current.hybridSearch(query, documents, 10);
            setResults(searchResults);
        } catch (error) {
            console.error('Search failed:', error);
            alert('Search failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 border rounded-lg space-y-4">
            <h2 className="text-xl font-bold">🔍 PDF Semantic Search</h2>
            
            {/* PDF Upload */}
            <div className="space-y-2">
                <label className="block text-sm font-medium">Upload PDF</label>
                <input
                    type="file"
                    accept=".pdf"
                    onChange={handlePDFUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {processing && <p className="text-sm text-gray-500">Processing PDF...</p>}
                {chunks.length > 0 && (
                    <p className="text-sm text-green-600">
                        ✓ PDF ready for search ({chunks.length} chunks)
                    </p>
                )}
            </div>
            
            {/* Search Input */}
            <div className="space-y-2">
                <label className="block text-sm font-medium">Ask about the PDF</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="e.g., 'What are the main findings?' or 'Explain the methodology'"
                        className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button
                        onClick={handleSearch}
                        disabled={loading || chunks.length === 0}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </div>
            </div>
            
            {/* Results */}
            {results.length > 0 && (
                <div className="space-y-3">
                    <h3 className="font-semibold">Results:</h3>
                    {results.map((result, index) => (
                        <div 
                            key={index}
                            className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-sm font-medium text-gray-700">
                                    Relevance: {(result.score * 100).toFixed(1)}%
                                </span>
                                {result.metadata && (
                                    <span className="text-xs text-gray-500">
                                        Page {result.metadata.pageNumber}
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-800">{result.text}</p>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Sample Questions */}
            {chunks.length > 0 && results.length === 0 && !loading && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 mb-2">💡 Try asking:</p>
                    <div className="flex flex-wrap gap-2">
                        {[
                            "What is this document about?",
                            "Summarize the main points",
                            "What are the key findings?",
                            "Explain the methodology",
                            "What conclusions are reached?"
                        ].map((sample, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    setQuery(sample);
                                    setTimeout(() => handleSearch(), 100);
                                }}
                                className="text-xs bg-white text-blue-700 px-3 py-1 rounded-full hover:bg-blue-100"
                            >
                                {sample}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}