// utils/dataAnalyzer.ts
import { DatasetRow } from './db';

export interface AnalysisResult {
    type: 'text' | 'table' | 'chart' | 'error';
    content: string;
    data?: any[];
    chartConfig?: {
        type: 'bar' | 'line' | 'pie';
        xKey: string;
        yKeys: string[];
    };
}

export class DataAnalyzer {
    static async analyze(rows: DatasetRow[], query: string): Promise<AnalysisResult> {
        const q = query.toLowerCase();

        // 1. Basic Aggregations (Sum, Avg, Count)
        if (q.includes('sum') || q.includes('total') || q.includes('average') || q.includes('mean')) {
            return this.handleAggregation(rows, q);
        }

        // 2. Trend/Chart Detection
        if (q.includes('chart') || q.includes('graph') || q.includes('trend') || q.includes('show by')) {
            return this.handleChart(rows, q);
        }

        // 3. Fallback to Search (handled by the caller using semanticSearch)
        return {
            type: 'text',
            content: 'I will perform a semantic search for your question.'
        };
    }

    private static handleAggregation(rows: DatasetRow[], query: string): AnalysisResult {
        const columns = Object.keys(rows[0] || {}).filter(k => k !== '_vector' && k !== 'id');
        let targetColumn = columns.find(c => query.includes(c.toLowerCase()));

        if (!targetColumn) {
            return { type: 'text', content: "I couldn't identify which column to aggregate. Please specify a column name." };
        }

        const values = rows.map(r => {
            const val = r[targetColumn!];
            return typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ""));
        }).filter(v => !isNaN(v));

        if (values.length === 0) {
            return { type: 'text', content: `Column "${targetColumn}" doesn't seem to contain numeric data.` };
        }

        if (query.includes('sum') || query.includes('total')) {
            const sum = values.reduce((a, b) => a + b, 0);
            return { type: 'text', content: `The total sum of **${targetColumn}** is **${sum.toLocaleString()}**.` };
        }

        if (query.includes('average') || query.includes('mean')) {
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            return { type: 'text', content: `The average of **${targetColumn}** is **${avg.toLocaleString()}**.` };
        }

        return { type: 'text', content: 'Processing aggregation...' };
    }

    private static handleChart(rows: DatasetRow[], query: string): AnalysisResult {
        const columns = Object.keys(rows[0] || {}).filter(k => k !== '_vector' && k !== 'id');

        // Find a categorical column (X-axis) and a numeric column (Y-axis)
        // Heuristic: Categorical columns usually have fewer unique values or are strings
        // Numeric columns are parsed as numbers

        const numericCols = columns.filter(c => {
            const sample = rows.find(r => r[c] !== undefined)?.[c];
            return typeof sample === 'number' || !isNaN(parseFloat(String(sample)));
        });

        const categoricalCols = columns.filter(c => !numericCols.includes(c));

        const xCol = categoricalCols.find(c => query.includes(c.toLowerCase())) || categoricalCols[0];
        const yCol = numericCols.find(c => query.includes(c.toLowerCase())) || numericCols[0];

        if (!xCol || !yCol) {
            return { type: 'text', content: "I need at least one numeric and one categorical column to create a chart." };
        }

        // Grouping logic
        const groups: Record<string, number> = {};
        rows.forEach(row => {
            const key = String(row[xCol]);
            const val = typeof row[yCol] === 'number' ? row[yCol] as number : parseFloat(String(row[yCol]).replace(/[^0-9.-]+/g, ""));
            if (!isNaN(val)) {
                groups[key] = (groups[key] || 0) + val;
            }
        });

        const chartData = Object.entries(groups).map(([name, value]) => ({ name, value })).slice(0, 10);

        return {
            type: 'chart',
            content: `Here is the chart for **${yCol}** by **${xCol}**:`,
            data: chartData,
            chartConfig: {
                type: query.includes('pie') ? 'pie' : 'bar',
                xKey: 'name',
                yKeys: ['value']
            }
        };
    }
}
