import EmbeddingEngine from './embeddingEngine';
import { DatasetRow } from './db';

/**
 * Converts a data row into a descriptive text string for embedding.
 */
export function rowToText(row: DatasetRow): string {
  return Object.entries(row)
    .filter(([key]) => key !== '_vector' && key !== 'id')
    .map(([key, value]) => `${key}: ${value}`)
    .join('. ');
}

export default async function hybridSearch(
  rows: DatasetRow[],
  question: string,
  onProgress?: (p: number) => void
): Promise<DatasetRow[]> {

  // 1. Embed the user's question (Vector Search)
  const queryVector = await EmbeddingEngine.embed(question);
  const queryLower = question.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

  // 2. Calculate Hybrid Scores
  const results = rows.map((row) => {
    // A. Vector Similarity (70% weight)
    const rowVector = (row as any)._vector;
    let vectorScore = 0;
    if (rowVector && rowVector.length > 0) {
      vectorScore = EmbeddingEngine.cosineSimilarity(queryVector, rowVector);
    }

    // B. Keyword Score (30% weight - BM25 Lite)
    const rowText = Object.values(row).join(' ').toLowerCase();
    let keywordScore = 0;
    if (queryWords.length > 0) {
      const matches = queryWords.filter(word => rowText.includes(word));
      keywordScore = matches.length / queryWords.length;
    }

    // C. Fusion Score
    const finalScore = (vectorScore * 0.7) + (keywordScore * 0.3);

    return { row, score: finalScore };
  });

  // 3. Sort and filter
  const sorted = results
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0.35) // Dynamic threshold
    .slice(0, 20)
    .map((item) => item.row);

  return sorted;
}