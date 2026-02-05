// utils/nlpEngine.ts
import nlp from 'compromise';
import { DatasetRow } from './db';

// Import via dynamic import to avoid Turbopack issues
let EmbeddingSearchEngineClass: any = null;

async function getEmbeddingEngine() {
    if (!EmbeddingSearchEngineClass) {
        const { EmbeddingSearchEngine } = await import('./embeddingSearch');
        EmbeddingSearchEngineClass = EmbeddingSearchEngine;
    }
    return EmbeddingSearchEngineClass;
}

export interface QueryIntent {
    type: 'filter' | 'aggregate' | 'search' | 'sort' | 'describe' | 'semantic' | 'unknown';
    operation: 'sum' | 'average' | 'count' | 'max' | 'min' | 'filter' | 'find' | 'sort' | 'top' | 'bottom' | 'describe' | 'semantic';
    column?: string;
    value?: any;
    conditions?: Array<{ column: string; operator: string; value: any }>;
    limit?: number;
    order?: 'asc' | 'desc';
    semanticQuery?: string;
}

export class ExcelNLPEngine {
    private embeddingEngine: any = null;

    constructor() {
        // Initialize embedding engine lazily
        this.initEmbeddingEngine();
    }

    private async initEmbeddingEngine() {
        try {
            const EmbeddingEngine = await getEmbeddingEngine();
            this.embeddingEngine = new EmbeddingEngine();
        } catch (error) {
            console.log('Embedding engine initialization deferred');
        }
    }

    public async parseQuery(query: string): Promise<QueryIntent> {
        const intent: QueryIntent = {
            type: 'search',
            operation: 'find'
        };

        const q = query.toLowerCase().trim();

        // Check if it's a semantic search question
        if (this.isSemanticQuestion(q)) {
            intent.type = 'semantic';
            intent.operation = 'semantic';
            intent.semanticQuery = query;
            return intent;
        }

        // Pattern matching for structured queries
        const patterns = this.getQueryPatterns(q);

        if (patterns.type !== 'unknown') {
            return patterns;
        }

        // Use compromise for more complex parsing
        return this.processWithCompromise(query);
    }

    private isSemanticQuestion(query: string): boolean {
        const semanticKeywords = [
            'what is', 'how to', 'explain', 'tell me about', 'describe',
            'compare', 'difference between', 'similarities between',
            'advantages of', 'disadvantages of', 'benefits of',
            'why is', 'when should', 'where can'
        ];

        return semanticKeywords.some(keyword => query.includes(keyword));
    }

    private getQueryPatterns(query: string): QueryIntent {
        const patterns: QueryIntent = {
            type: 'unknown',
            operation: 'find'
        };

        // Sum patterns
        const sumMatch = query.match(/(?:sum|total)\s+(?:of\s+)?(\w+)/i);
        if (sumMatch) {
            patterns.type = 'aggregate';
            patterns.operation = 'sum';
            patterns.column = sumMatch[1];
            return patterns;
        }

        // Average patterns
        const avgMatch = query.match(/(?:average|mean|avg)\s+(?:of\s+)?(\w+)/i);
        if (avgMatch) {
            patterns.type = 'aggregate';
            patterns.operation = 'average';
            patterns.column = avgMatch[1];
            return patterns;
        }

        // Count patterns
        if (query.match(/(?:count|how many)\s+(?:rows|records)?/i)) {
            patterns.type = 'aggregate';
            patterns.operation = 'count';
            return patterns;
        }

        // Filter patterns
        const filterMatch = query.match(/(?:show|find|list)\s+(?:rows|records)?\s+(?:where|with)\s+(\w+)\s+(?:is|equals?|=)\s+(['"]?)([^'"\n]+)\2/i);
        if (filterMatch) {
            patterns.type = 'filter';
            patterns.operation = 'filter';
            patterns.column = filterMatch[1];
            patterns.value = filterMatch[3];
            patterns.conditions = [{
                column: filterMatch[1],
                operator: '=',
                value: filterMatch[3]
            }];
            return patterns;
        }

        return patterns;
    }

    private processWithCompromise(query: string): QueryIntent {
        const doc = nlp(query);
        const intent: QueryIntent = {
            type: 'search',
            operation: 'find'
        };

        const q = query.toLowerCase();

        // Extract column names
        const nouns = doc.nouns().out('array');
        const filteredNouns = nouns.filter((word: string) => !this.isCommonWord(word));

        if (filteredNouns.length > 0) {
            intent.column = filteredNouns[0].toLowerCase();
        }

        // Extract numbers
        const numbers = doc.numbers().out('array');
        if (numbers.length > 0) {
            intent.value = parseFloat(numbers[0]);
            intent.limit = parseInt(numbers[0]);
        }

        return intent;
    }

    private isCommonWord(word: string): boolean {
        const commonWords = [
            'data', 'rows', 'records', 'file', 'excel', 'sheet', 'table',
            'show', 'find', 'all', 'the', 'a', 'an', 'what', 'is', 'are',
            'of', 'in', 'by', 'with', 'where', 'and', 'or', 'not'
        ];
        return commonWords.includes(word.toLowerCase());
    }

    // Semantic search for natural language questions
    public async semanticSearchInData(
        query: string,
        data: Array<{ text: string, metadata?: any }>,
        onProgress?: (progress: number) => void
    ): Promise<Array<{ text: string, score: number, metadata?: any }>> {
        if (!this.embeddingEngine) {
            await this.initEmbeddingEngine();
        }

        if (this.embeddingEngine) {
            // Manually ensure initialized with progress if needed
            if (!this.embeddingEngine.isInitialized) {
                await this.embeddingEngine.initialize({ onProgress });
            }
            return this.embeddingEngine.semanticSearch(query, data, 5);
        }

        // Fallback to simple search
        return this.simpleSearch(query, data, 5);
    }

    private simpleSearch(
        query: string,
        data: Array<{ text: string, metadata?: any }>,
        topK: number
    ): Array<{ text: string, score: number, metadata?: any }> {
        const queryLower = query.toLowerCase();
        const results = data.map(item => {
            const textLower = item.text.toLowerCase();
            let score = 0;

            if (textLower.includes(queryLower)) {
                score = 0.8;
            } else {
                // Check for word matches
                const queryWords = queryLower.split(/\s+/);
                const textWords = textLower.split(/\s+/);
                const matches = queryWords.filter(word =>
                    textWords.some(tw => tw.includes(word))
                );
                score = matches.length / queryWords.length * 0.5;
            }

            return {
                text: item.text,
                score,
                metadata: item.metadata
            };
        });

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, topK)
            .filter(r => r.score > 0.1);
    }
}