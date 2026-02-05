// app/page.tsx
'use client';

import { useState } from 'react';
import { ExcelUpload } from './components/ExcelUpload';
import { DatasetList } from './components/DatasetList';
import { ExcelChat } from './components/ExcelChat';
import { PDFSearch } from './components/PDFSearch';

export default function Home() {
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'excel' | 'pdf'>('excel');

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">📊 AI-Powered Data & Document Chat</h1>
        <p className="text-gray-600 mt-2">Upload Excel files or PDFs and chat with them using natural language</p>
      </header>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab('excel')}
          className={`px-4 py-2 font-medium ${activeTab === 'excel' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          📈 Excel Chat
        </button>
        <button
          onClick={() => setActiveTab('pdf')}
          className={`px-4 py-2 font-medium ${activeTab === 'pdf' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          📄 PDF Search
        </button>
      </div>

      {activeTab === 'excel' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Upload & Dataset List */}
          <div className="space-y-6">
            <ExcelUpload onUploadSuccess={handleUploadSuccess} />
            <DatasetList
              onSelect={setDatasetId}
              refreshKey={refreshKey}
            />
          </div>

          {/* Right Column - Chat */}
          <div className="lg:col-span-2">
            <ExcelChat datasetId={datasetId} />
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <PDFSearch />
        </div>
      )}

      {/* Features */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white border rounded-lg">
          <div className="text-2xl mb-3">🤖</div>
          <h3 className="font-bold text-lg mb-2">AI-Powered Search</h3>
          <p className="text-gray-600">Uses semantic search to understand natural language questions</p>
        </div>
        <div className="p-6 bg-white border rounded-lg">
          <div className="text-2xl mb-3">⚡</div>
          <h3 className="font-bold text-lg mb-2">Lightweight Model</h3>
          <p className="text-gray-600">80MB embedding model runs entirely in your browser</p>
        </div>
        <div className="p-6 bg-white border rounded-lg">
          <div className="text-2xl mb-3">🔒</div>
          <h3 className="font-bold text-lg mb-2">Privacy First</h3>
          <p className="text-gray-600">All processing happens locally, no data sent to servers</p>
        </div>
      </div>
    </div>
  );
}