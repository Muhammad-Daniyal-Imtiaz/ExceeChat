// utils/localQuery.ts
import { DatasetRow } from './db';

export type QueryResult =
    | DatasetRow[]
    | { total: number }
    | { message: string };

export function runLocalQuery(
    rows: DatasetRow[],
    question: string
): QueryResult {
    const q = question.toLowerCase().trim();

    // 1. If input is empty, just show the first 10 rows
    if (!q) {
        return rows.slice(0, 10);
    }

    // 2. SMART SEARCH: Look for the keyword in ANY column
    const searchResults = rows.filter((row) => {
        // Convert all values in the row to a string and check if it contains the question
        return Object.values(row).some((val) => {
            const strVal = String(val ?? '').toLowerCase();
            return strVal.includes(q);
        });
    });

    // 3. If no results found
    if (searchResults.length === 0) {
        return { message: `No results found for "${question}". Try a different keyword.` };
    }

    // 4. Return results (limit to 20 to keep the screen clean)
    return searchResults.slice(0, 20);
}