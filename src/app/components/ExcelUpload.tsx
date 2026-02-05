'use client';

import { useState } from 'react';
import { db, Dataset } from '../utils/db'; // Check path: utils is one level up from components
import { parseExcel } from '../utils/parseExcel';

// Add the onUploadSuccess prop here
type Props = {
  onUploadSuccess?: () => void;
};

export function ExcelUpload({ onUploadSuccess }: Props) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage('');

    try {
      const rows = await parseExcel(file);
      const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();

      const dataset: Dataset = {
        id,
        name: file.name,
        createdAt: Date.now(),
        rowCount: rows.length,
        rows,
      };

      await db.datasets.add(dataset);

      setMessage(`✅ Saved "${file.name}" (${rows.length} rows) to IndexedDB`);

      // CRITICAL: Tell the parent component to refresh the list!
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err) {
      console.error(err);
      setMessage('❌ Failed to parse or save the Excel file.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 border rounded space-y-2">
      <h2 className="text-lg font-semibold">Upload Excel (IndexedDB)</h2>
      <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
      {uploading && <p>Uploading and parsing...</p>}
      {message && <p>{message}</p>}
    </div>
  );
}