// page.tsx
'use client';

import { useState } from 'react';
import { ExcelUpload } from './components/ExcelUpload';
import { ExcelChat } from './components/ExcelChat';
import { PDFSearch } from './components/PDFSearch';
import { DatasetList } from './components/DatasetList';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'excel' | 'pdf'>('excel');
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDatasetSelect = (id: string) => {
    setDatasetId(id);
  };

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <main className="min-h-screen bg-[#fcfdfe] text-gray-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[0%] right-[-5%] w-[30%] h-[40%] bg-blue-50/50 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-[1600px] mx-auto p-4 sm:p-8 lg:p-12">
        {/* Navigation / Header */}
        <header className="flex flex-col sm:flex-row items-center justify-between mb-12 gap-6">
          <div className="anim-fade-in">
            <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-2">
              <span className="bg-indigo-600 text-white p-2 rounded-xl">CP</span>
              <span>CPDF.ai</span>
            </h1>
            <p className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-[0.2em]">Production-Grade Local Intelligence</p>
          </div>

          <nav className="flex items-center gap-1 p-1 bg-gray-100/80 rounded-2xl backdrop-blur-sm anim-fade-in shadow-inner">
            <button
              onClick={() => setActiveTab('excel')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'excel'
                  ? 'bg-white text-indigo-600 shadow-md transform scale-[1.05]'
                  : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              📊 Data Analyst
            </button>
            <button
              onClick={() => setActiveTab('pdf')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'pdf'
                  ? 'bg-white text-red-600 shadow-md transform scale-[1.05]'
                  : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              📄 PDF Researcher
            </button>
          </nav>

          <div className="hidden sm:flex items-center gap-4 anim-fade-in">
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">System Status</p>
              <p className="text-[12px] font-bold text-green-600">Local Hub Active</p>
            </div>
            <div className="w-10 h-10 bg-gray-100 rounded-full border border-gray-200"></div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 anim-slide-up">
          {activeTab === 'excel' ? (
            <>
              {/* Left Sidebar */}
              <div className="lg:col-span-4 space-y-8 h-fit lg:sticky lg:top-8">
                <ExcelUpload onUploadSuccess={handleUploadSuccess} />
                <DatasetList
                  onSelect={handleDatasetSelect}
                  refreshKey={refreshKey}
                  selectedId={datasetId}
                />
              </div>

              {/* Main Area */}
              <div className="lg:col-span-8">
                <ExcelChat datasetId={datasetId || ''} />
              </div>
            </>
          ) : (
            <div className="lg:col-span-12 max-w-5xl mx-auto w-full">
              <PDFSearch />
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-24 pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 opacity-40 hover:opacity-100 transition-opacity">
          <div className="flex gap-12">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2">Security</p>
              <p className="text-[11px] font-bold">100% Client-Side Processing</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2">Engine</p>
              <p className="text-[11px] font-bold">@huggingface/transformers 3.0</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2">Storage</p>
              <p className="text-[11px] font-bold">IndexedDB Native Hub</p>
            </div>
          </div>
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase">© 2026 CPDF Systems Inc.</p>
        </footer>
      </div>
    </main>
  );
}