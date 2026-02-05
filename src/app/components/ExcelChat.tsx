// components/ExcelChat.tsx
'use client';

import { useState, useEffect } from 'react';
import { db, Dataset, DatasetRow } from '../utils/db';
import semanticSearch from '../utils/embeddingSearch';
import { DataAnalyzer, AnalysisResult } from '../utils/dataAnalyzer';
import { VisualResult } from './VisualResult';

type Message = {
    role: 'user' | 'assistant';
    content: string;
    analysis?: AnalysisResult;
    results?: DatasetRow[];
};

export function ExcelChat({ datasetId }: { datasetId: string }) {
    const [dataset, setDataset] = useState<Dataset | null>(null);
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);

    useEffect(() => {
        const loadDataset = async () => {
            if (!datasetId) return;
            const data = await db.datasets.get(datasetId);
            if (data) setDataset(data);
        };
        loadDataset();
    }, [datasetId]);

    const handleAsk = async () => {
        if (!question.trim() || !dataset) return;

        const userMsg: Message = { role: 'user', content: question };
        setMessages(prev => [...prev, userMsg]);
        setQuestion('');
        setLoading(true);

        try {
            // 1. Try Advanced Data Analyzer (Aggregations/Charts)
            const analysis = await DataAnalyzer.analyze(dataset.rows, userMsg.content);

            let assistantMsg: Message = {
                role: 'assistant',
                content: analysis.content,
                analysis: analysis.type !== 'text' ? analysis : undefined
            };

            // 2. Fallback or Supplement with Semantic Search
            if (analysis.type === 'text') {
                const foundRows = await semanticSearch(dataset.rows, userMsg.content);
                assistantMsg.results = foundRows;
                if (foundRows.length === 0) {
                    assistantMsg.content = "I couldn't find any relevant data for that question.";
                } else {
                    assistantMsg.content = `I found ${foundRows.length} relevant entries for you:`;
                }
            }

            setMessages(prev => [...prev, assistantMsg]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error while analyzing your data.'
            }]);
        } finally {
            setLoading(false);
        }
    };

    if (!datasetId) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] border-2 border-dashed rounded-3xl bg-gray-50/50 text-gray-400 border-gray-200">
                <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <p className="font-medium">Select a dataset to begin the conversation</p>
                <p className="text-xs mt-2">Analyzed files are stored securely in your browser</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[700px] bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden transition-all duration-500">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                        {dataset?.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-gray-800 leading-none">{dataset?.name}</h2>
                        <p className="text-[10px] text-gray-400 font-medium mt-1 uppercase tracking-wider">{dataset?.rowCount} rows loaded in memory</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-100">
                    <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] font-bold text-green-700 uppercase tracking-tighter">AI Engine Online</span>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gradient-to-b from-gray-50/50 to-white">
                {messages.length === 0 && (
                    <div className="text-center py-12 anim-fade-in">
                        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-3 shadow-sm">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h3 className="text-gray-900 font-bold text-xl">Advanced Data Analyst</h3>
                        <p className="text-gray-500 text-sm max-w-sm mx-auto mt-3 leading-relaxed">
                            I can calculate totals, averages, and even generate charts from your Excel data. Try asking:
                        </p>
                        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
                            {[
                                "What is the total sum of...?",
                                "Show me a bar chart of...",
                                "Average value for each...",
                                "Find rows where..."
                            ].map((prompt, i) => (
                                <button
                                    key={i}
                                    onClick={() => setQuestion(prompt)}
                                    className="px-4 py-3 bg-white border border-gray-100 rounded-xl text-xs font-semibold text-gray-600 hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md transition-all text-left"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} anim-slide-up`}>
                        <div className={`max-w-[90%] rounded-2xl p-5 shadow-sm group ${msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                            }`}>
                            <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                            {msg.analysis && (
                                <VisualResult
                                    type={msg.analysis.type as any}
                                    data={msg.analysis.data}
                                    config={msg.analysis.chartConfig}
                                    title={msg.analysis.type === 'chart' ? 'Automated Visualization' : undefined}
                                />
                            )}

                            {msg.results && msg.results.length > 0 && (
                                <div className="mt-5 overflow-hidden border border-gray-100 rounded-xl bg-gray-50/50">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-[11px]">
                                            <thead className="bg-gray-100/80 text-gray-500 uppercase tracking-widest font-bold">
                                                <tr>
                                                    {Object.keys(msg.results[0])
                                                        .filter(k => k !== '_vector' && k !== 'id')
                                                        .map(key => (
                                                            <th key={key} className="px-4 py-3 border-b border-gray-100 font-black">{key}</th>
                                                        ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {msg.results.slice(0, 10).map((row, ridx) => (
                                                    <tr key={ridx} className="bg-white/40 hover:bg-white transition-colors">
                                                        {Object.entries(row)
                                                            .filter(([k]) => k !== '_vector' && k !== 'id')
                                                            .map(([k, v], vidx) => (
                                                                <td key={vidx} className="px-4 py-2.5 text-gray-700 font-medium truncate max-w-[200px] border-b border-gray-50">{String(v)}</td>
                                                            ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {msg.results.length > 10 && (
                                        <div className="px-4 py-2.5 bg-gray-50 text-[10px] text-gray-400 font-bold uppercase tracking-tighter border-t border-gray-100 flex justify-between items-center">
                                            <span>Showing top 10 of {msg.results.length} matches</span>
                                            <button className="text-indigo-600 hover:underline">View All</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start anim-fade-in">
                        <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none p-5 shadow-sm flex items-center gap-4">
                            <div className="flex gap-1.5">
                                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            </div>
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Generating Insight</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-6 border-t bg-white relative">
                <div className="max-w-4xl mx-auto flex items-center shadow-xl shadow-indigo-100/50 rounded-2xl overflow-hidden border border-gray-100 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all duration-300">
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
                        disabled={loading}
                        placeholder="Type a question or command..."
                        className="flex-1 bg-white px-6 py-4 text-sm font-medium placeholder:text-gray-300 focus:outline-none disabled:opacity-50"
                    />
                    <button
                        onClick={handleAsk}
                        disabled={loading || !question.trim()}
                        className="bg-indigo-600 text-white px-7 py-4 hover:bg-indigo-700 active:scale-95 transition-all disabled:bg-gray-100 disabled:text-gray-300"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                <p className="text-[9px] text-center mt-3 text-gray-300 font-black uppercase tracking-tighter">AI processes your data purely in your browser for 100% privacy</p>
            </div>
        </div>
    );
}