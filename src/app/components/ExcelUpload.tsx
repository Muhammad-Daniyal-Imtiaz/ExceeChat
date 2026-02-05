'use client';

import { useState } from 'react';
import { db, Dataset } from '../utils/db';
import { parseExcel } from '../utils/parseExcel';
import EmbeddingEngine from '../utils/embeddingEngine'; // Importing the Class

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
    setStatus('Parsing Excel...');
    setProgress(0);

    try {
      // 1. Parse Excel
      const rows = await parseExcel(file);
      setStatus('Loading AI Model (80MB)...');

      // 2. Load AI Model
      const extractor = await EmbeddingEngine.getInstance((p) => setProgress(p));
      setStatus(`Processing AI embeddings for ${rows.length} rows...`);

      // 3. Create text representation for each row to embed
      const rowsWithVectors = await Promise.all(
        rows.map(async (row, index) => {
          const textToEmbed = Object.entries(row)
            .map(([key, value]) => `${key}: ${value}`)
            .join('. ');

          const vector = await EmbeddingEngine.embed(textToEmbed, extractor);

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
      const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
      const dataset: Dataset = {
        id,
        name: file.name,
        createdAt: Date.now(),
        rowCount: rows.length,
        rows: rowsWithVectors,
      };

      await db.datasets.add(dataset);
      setStatus('✅ Done!');
      if (onUploadSuccess) onUploadSuccess();

    } catch (err) {
      console.error(err);
      setStatus('❌ Error processing file.');
    } finally {
      setUploading(false);
      setTimeout(() => setStatus(''), 3000);
    }
  };

  return (
    <div className="p-4 border rounded space-y-2 bg-white shadow-sm">
      <h2 className="text-lg font-semibold">Upload Excel (AI Enhanced)</h2>
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        disabled={uploading}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      {uploading && (
        <div className="space-y-2 mt-2">
          <p className="text-sm font-medium text-blue-600">{status}</p>
          {progress > 0 && progress < 100 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}