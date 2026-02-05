// utils/hybridSearch.ts
import EmbeddingEngine from './embeddingEngine';
import { DatasetRow } from './db';

interface ScoredItem {
  row: DatasetRow;
  score: number;
}

// Simple Keyword Tokenizer
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(w => w.length > 2); // Remove short words
}

// Calculate Keyword Score (TF-IDF / BM25 Lite)
function calculateKeywordScore(query: string, rowText: string): number {
  const queryTokens = tokenize(query);
  const rowTokens = tokenize(rowText);
  
  if (queryTokens.length === 0) return 0;

  let matches = 0;
  for (const q of queryTokens) {
    if (rowTokens.includes(q)) matches++;
  }

  // Score based on coverage of query terms
  return matches / queryTokens.length;
}

// Reciprocal Rank Fusion (RRF) - The algorithm Google uses
function mergeResults(
  semanticResults: ScoredItem[], 
  keywordResults: ScoredItem[],
  k: number = 60 // Constant for RRF
): ScoredItem[] {
  
  const combinedScores: Map<string, number> = new Map();
  const combinedItems: Map<string, DatasetRow> = new Map();

  // Helper to process a result list
  const process = (results: ScoredItem[], weight: number) => {
    results.forEach((item, index) => {
      // Generate a stable ID for the row
      const id = JSON.stringify(item.row);
      
      const score = 1 / (k + index + 1); // RRF formula
      
      combinedScores.set(id, (combinedScores.get(id) || 0) + (score * weight));
      combinedItems.set(id, item.row);
    });
  };

  // Process Semantic (Weighted higher for concepts)
  process(semanticResults, 1.5); // 1.5x Weight to AI
  // Process Keyword (Weighted lower but crucial for exact matches)
  process(keywordResults, 1.0);

  // Convert back to array and sort
  const final = Array.from(combinedScores.entries())
    .map(([id, score]) => ({
      row: combinedItems.get(id)!,
      score
    }))
    .sort((a, b) => b.score - a.score);

  return final;
}

export async function hybridSearch(
  rows: DatasetRow[],
  question: string,
  onProgress?: (p: number) => void
): Promise<DatasetRow[]> {

  // 1. SEMANTIC SEARCH (The AI part)
  const queryVector = await EmbeddingEngine.embed(question);

  const semanticScores = rows.map((row) => {
    const rowVector = (row as any)._vector;
    
    if (!rowVector || rowVector.length === 0) return null;

    const score = EmbeddingEngine.cosineSimilarity(queryVector, rowVector);
    return { row, score };
  }).filter(Boolean) as ScoredItem[];

  const semanticTop = semanticScores
    .sort((a, b) => b.score - a.score)
    .slice(0, 50); // Take top 50 semantic matches

  // 2. KEYWORD SEARCH (The Math part)
  const keywordScores = rows.map((row) => {
    // Convert row to string for searching
    const rowText = Object.values(row).join(' ');
    const score = calculateKeywordScore(question, rowText);
    return { row, score };
  }).filter(item => item.score > 0); // Only keep rows with ANY keyword match

  const keywordTop = keywordScores
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);

  // 3. MERGE & RERANK (The Magic)
  const merged = mergeResults(semanticTop, keywordTop);

  // 4. Threshold & Return
  const finalResults = merged
    .filter(item => item.score > 0.05) // Threshold
    .slice(0, 20)
    .map(item => item.row);

  return finalResults;
}

// Helper to create row text for embedding
export function rowToText(row: DatasetRow): string {
  return Object.entries(row)
    .filter(([k]) => k !== '_vector' && k !== 'id')
    .map(([key, value]) => {
      // Convert keys to readable text
      const label = key.replace(/_/g, ' ');
      return `${label}: ${value}`;
    })
    .join('. ');
}