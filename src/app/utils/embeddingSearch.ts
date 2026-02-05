// utils/embeddingSearch.ts
import EmbeddingEngine from './embeddingEngine';
import { DatasetRow } from './db';

export  default async function semanticSearch(
  rows: DatasetRow[], 
  question: string, 
  onProgress?: (p: number) => void
): Promise<DatasetRow[]> {

  // 1. Load Model
  const extractor = await EmbeddingEngine.getInstance(onProgress);

  // 2. Embed the user's question
  const queryVector = await EmbeddingEngine.embed(question, extractor);

  // 3. Calculate similarity for every row
  // Because we pre-calculated row vectors during upload, this is very fast!
  const results = rows.map((row) => {
    const rowVector = (row as any)._vector; // Retrieve the saved vector
    
    if (!rowVector || rowVector.length === 0) {
      return { row, score: 0 };
    }

    const score = EmbeddingEngine.cosineSimilarity(queryVector, rowVector);
    return { row, score };
  });

  // 4. Sort by highest score (most similar) and take top 20
  const sorted = results
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0.4) // Filter out weak matches (Threshold 0.4)
    .slice(0, 20)
    .map((item) => item.row);

  return sorted;
}