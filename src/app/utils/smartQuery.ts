// utils/smartQuery.ts
import { DatasetRow } from './db';

// Import via dynamic import to avoid Turbopack issues
let ExcelNLPEngineClass: any = null;

async function getNLPEngine() {
    if (!ExcelNLPEngineClass) {
        const { ExcelNLPEngine } = await import('./nlpEngine');
        ExcelNLPEngineClass = ExcelNLPEngine;
    }
    return ExcelNLPEngineClass;
}

export type QueryResult =
    | DatasetRow[]
    | { [key: string]: number | string }
    | { message: string }
    | { summary: any }
    | { columns: string[] }
    | { semanticResults: Array<{ text: string, score: number }> };

export class SmartQueryEngine {
    private nlpEngine: any = null;

    constructor() {
        // Initialize NLP engine lazily
        this.initNLPEngine();
    }

    private async initNLPEngine() {
        try {
            const NLPEngine = await getNLPEngine();
            this.nlpEngine = new NLPEngine();
        } catch (error) {
            console.log('NLP engine initialization deferred');
        }
    }

    public async runQuery(
        rows: DatasetRow[],
        question: string
    ): Promise<QueryResult> {
        if (!question.trim()) {
            return rows.slice(0, 10);
        }

        // Initialize NLP engine if not already
        if (!this.nlpEngine) {
            await this.initNLPEngine();
        }

        // Get query intent
        let intent;
        try {
            intent = await this.nlpEngine.parseQuery(question);
        } catch (error) {
            console.error('Query parsing failed:', error);
            return this.executeSmartSearch(rows, question);
        }

        // Execute based on intent
        switch (intent.type) {
            case 'aggregate':
                return this.executeAggregate(rows, intent);
            case 'filter':
                return this.executeFilter(rows, intent);
            case 'sort':
                return this.executeSort(rows, intent);
            case 'semantic':
                return this.executeSemantic(rows, question, intent);
            case 'describe':
                return this.executeDescribe(rows);
            default:
                return this.executeSmartSearch(rows, question);
        }
    }

    private executeAggregate(rows: DatasetRow[], intent: any): QueryResult {
        if (!intent.column && intent.operation !== 'count') {
            return { message: `Please specify a column for ${intent.operation}` };
        }

        switch (intent.operation) {
            case 'sum':
                const sum = rows.reduce((acc, row) => {
                    const val = parseFloat(row[intent.column!]);
                    return acc + (isNaN(val) ? 0 : val);
                }, 0);
                return { [`sum_${intent.column}`]: sum };

            case 'average':
                const numericValues = rows
                    .map(row => parseFloat(row[intent.column!]))
                    .filter(val => !isNaN(val));

                if (numericValues.length === 0) {
                    return { message: `No numeric values found in column "${intent.column}"` };
                }

                const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
                return { [`average_${intent.column}`]: parseFloat(avg.toFixed(2)) };

            case 'count':
                return { total_count: rows.length };

            case 'max':
                const maxValues = rows
                    .map(row => parseFloat(row[intent.column!]))
                    .filter(val => !isNaN(val));

                if (maxValues.length === 0) {
                    return { message: `No numeric values in "${intent.column}"` };
                }

                const max = Math.max(...maxValues);
                return { [`max_${intent.column}`]: max };

            case 'min':
                const minValues = rows
                    .map(row => parseFloat(row[intent.column!]))
                    .filter(val => !isNaN(val));

                if (minValues.length === 0) {
                    return { message: `No numeric values in "${intent.column}"` };
                }

                const min = Math.min(...minValues);
                return { [`min_${intent.column}`]: min };

            default:
                return { message: `Unknown aggregate operation: ${intent.operation}` };
        }
    }

    private executeFilter(rows: DatasetRow[], intent: any): QueryResult {
        let filtered = [...rows];

        if (intent.conditions && intent.conditions.length > 0) {
            filtered = filtered.filter(row => {
                return intent.conditions!.every((condition: any) => {
                    if (!condition.column || !row.hasOwnProperty(condition.column)) {
                        return false;
                    }

                    const rowValue = row[condition.column];
                    const conditionValue = condition.value;

                    switch (condition.operator) {
                        case '=':
                            return String(rowValue).toLowerCase() === String(conditionValue).toLowerCase();
                        case '>':
                            return parseFloat(rowValue) > parseFloat(conditionValue);
                        case '<':
                            return parseFloat(rowValue) < parseFloat(conditionValue);
                        case 'contains':
                            return String(rowValue).toLowerCase().includes(String(conditionValue).toLowerCase());
                        default:
                            return true;
                    }
                });
            });
        }

        if (filtered.length === 0) {
            return { message: `No results found for your filter criteria` };
        }

        return filtered.slice(0, 50);
    }

    private executeSort(rows: DatasetRow[], intent: any): QueryResult {
        if (!intent.column) {
            return { message: 'Please specify a column to sort by' };
        }

        if (!rows[0] || !rows[0].hasOwnProperty(intent.column)) {
            return { message: `Column "${intent.column}" not found in the data` };
        }

        const sorted = [...rows].sort((a, b) => {
            const valA = a[intent.column!];
            const valB = b[intent.column!];

            const numA = parseFloat(valA);
            const numB = parseFloat(valB);

            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }

            return String(valA).localeCompare(String(valB));
        });

        if (intent.order === 'desc') {
            sorted.reverse();
        }

        return (intent.limit ? sorted.slice(0, intent.limit) : sorted.slice(0, 20));
    }

    private async executeSemantic(
        rows: DatasetRow[],
        question: string,
        intent: any
    ): Promise<QueryResult> {
        try {
            // Convert rows to text for semantic search
            const documents = rows.map((row, index) => {
                const rowText = Object.entries(row)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ');
                return {
                    text: `Row ${index + 1}: ${rowText}`,
                    metadata: { rowIndex: index, rowData: row }
                };
            });

            const results = await this.nlpEngine.semanticSearchInData(question, documents);

            // Extract actual rows from results
            const semanticRows = results
                .filter((r: any) => r.metadata?.rowIndex !== undefined)
                .map((r: any) => rows[r.metadata.rowIndex])
                .filter(Boolean);

            if (semanticRows.length > 0) {
                return semanticRows.slice(0, 10);
            }

            return {
                message: `I analyzed your question but couldn't find specific matches. Try asking more directly about your data.`
            };

        } catch (error) {
            console.error('Semantic search failed:', error);
            return this.executeSmartSearch(rows, question);
        }
    }

    private executeDescribe(rows: DatasetRow[]): QueryResult {
        if (rows.length === 0) {
            return { message: 'No data available' };
        }

        const columns = Object.keys(rows[0]);
        const summary: any = {
            total_rows: rows.length,
            columns: columns.length,
            column_names: columns
        };

        columns.forEach(col => {
            const values = rows.map(row => row[col]);
            const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));

            if (numericValues.length > 0) {
                summary[col] = {
                    type: 'numeric',
                    count: numericValues.length,
                    unique: new Set(values).size,
                    min: Math.min(...numericValues),
                    max: Math.max(...numericValues),
                    average: parseFloat((numericValues.reduce((a, b) => a + b, 0) / numericValues.length).toFixed(2))
                };
            } else {
                summary[col] = {
                    type: 'text',
                    count: values.length,
                    unique: new Set(values.map(v => String(v))).size,
                    sample: values.slice(0, 3).map(v => String(v))
                };
            }
        });

        return { summary };
    }

    private executeSmartSearch(rows: DatasetRow[], query: string): QueryResult {
        const q = query.toLowerCase();

        // Try to detect column-value pattern
        const columnValueMatch = q.match(/(\w+)\s*[:=]\s*(.+)/);
        if (columnValueMatch) {
            const [, column, value] = columnValueMatch;
            if (rows[0] && column in rows[0]) {
                const filtered = rows.filter(row =>
                    String(row[column]).toLowerCase().includes(value.trim().toLowerCase())
                );
                if (filtered.length > 0) {
                    return filtered.slice(0, 20);
                }
            }
        }

        // Fallback to full-text search
        const results = rows.filter(row =>
            Object.values(row).some(val =>
                String(val).toLowerCase().includes(q)
            )
        );

        return results.length > 0 ? results.slice(0, 20) :
            { message: `No results found for "${query}"` };
    }
}