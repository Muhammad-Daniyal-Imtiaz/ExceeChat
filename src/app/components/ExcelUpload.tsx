// components/ExcelUpload.tsx
'use client';

import { useState } from 'react';
import { db, Dataset } from '../utils/db';
import { parseExcel } from '../utils/parseExcel';
import EmbeddingEngine from '../utils/embeddingEngine';

type Props = {
  onUploadSuccess?: () => void;
};

export function ExcelUpload({ onUploadSuccess }: Props) {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatus('Parsing structure...');
    setProgress(0);

    try {
      // 1. Parse Excel
      const rows = await parseExcel(file);
      setStatus('Initializing AI Engine...');

      // 2. Load AI Model
      await EmbeddingEngine.getInstance((p) => setProgress(p));
      setStatus(`Analyzing ${rows.length} records...`);

      // 3. Create text representation for each row to embed
      const rowsWithVectors = await Promise.all(
        rows.map(async (row, index) => {
          const textToEmbed = Object.entries(row)
            .map(([key, value]) => `${key}: ${value}`)
            .join('. ');

          const vector = await EmbeddingEngine.embed(textToEmbed);

          if (index % 10 === 0) {
            setProgress(Math.round((index / rows.length) * 100));
          }

          return {
            ...row,
            _vector: vector,
          };
        })
      );

      // 4. Save to IndexedDB
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
      const dataset: Dataset = {
        id,
        name: file.name,
        createdAt: Date.now(),
        rowCount: rows.length,
        rows: rowsWithVectors,
      };

      await db.datasets.add(dataset);
      setStatus('Successfully indexed!');
      if (onUploadSuccess) onUploadSuccess();

    } catch (err) {
      console.error(err);
      setStatus('Processing failed.');
    } finally {
      setUploading(false);
      setTimeout(() => setStatus(''), 5000);
    }
  };

  return (
    <div className="relative group">
      <label className={`flex flex-col items-center justify-center w-full min-h-[140px] px-6 py-8 transition-all duration-300 bg-white border-2 border-dashed rounded-3xl cursor-pointer ${uploading
          ? 'border-indigo-400 bg-indigo-50/10'
          : 'border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/5'
        }`}>
        {!uploading ? (
          <div className="flex flex-col items-center justify-center anim-fade-in text-center">
            <div className="w-12 h-12 mb-3 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-sm font-bold text-gray-800 uppercase tracking-tighter">Enhanced Excel Import</p>
            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">XLSX, XLS, or CSV supported</p>
          </div>
        ) : (
          <div className="w-full max-w-xs space-y-4 anim-fade-in">
            <div className="flex justify-between items-end">
              <span className="text-[11px] font-black text-indigo-600 uppercase tracking-widest animate-pulse">{status}</span>
              <span className="text-[14px] font-bold text-gray-800">{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(79,70,229,0.4)]"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-widest">Indexing for Semantic search</p>
          </div>
        )}
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {status && !uploading && (
        <div className={`absolute -bottom-10 left-0 right-0 text-center anim-slide-up bg-white px-4 py-2 rounded-xl shadow-lg border border-gray-100 mx-auto w-fit z-20`}>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${status.includes('✅') || status.includes('Success') ? 'text-green-600' : 'text-red-500'}`}>
            {status}
          </span>
        </div>
      )}
    </div>
  );
}