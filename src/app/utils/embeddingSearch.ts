// utils/embeddingSearch.ts
export interface SearchResult {
    text: string;
    score: number;
    metadata?: any;
}

export class EmbeddingSearchEngine {
    private extractor: any = null;
    private isInitialized = false;
    private modelName = 'Xenova/all-MiniLM-L6-v2';

    async initialize() {
        if (this.isInitialized) return;

        try {
            // Dynamic import to avoid Turbopack issues
            const { pipeline } = await import('@xenova/transformers');

            this.extractor = await pipeline(
                'feature-extraction',
                this.modelName,
                {
                    quantized: true,
                    progress_callback: (progress: any) => {
                        console.log(`Downloading model: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
                    }
                }
            );

            this.isInitialized = true;
            console.log('Embedding model loaded successfully');
        } catch (error) {
            console.error('Failed to load embedding model:', error);
            // Fallback to simple search
        }
    }

    async createEmbedding(text: string): Promise<number[]> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.extractor) {
            console.warn('Embedding model not available, using fallback');
            return [];
        }

        try {
            const result = await this.extractor(text, {
                pooling: 'mean',
                normalize: true
            });

            return Array.from(result.data);
        } catch (error) {
            console.error('Embedding generation failed:', error);
            return [];
        }
    }

    async semanticSearch(
        query: string,
        documents: Array<{ text: string; metadata?: any }>,
        topK: number = 5
    ): Promise<SearchResult[]> {
        if (documents.length === 0) return [];

        const queryEmbedding = await this.createEmbedding(query);
        if (queryEmbedding.length === 0) {
            // Fallback to keyword search
            return this.keywordSearch(query, documents, topK);
        }

        const results: SearchResult[] = [];
        const queryLower = query.toLowerCase();

        // Process in smaller batches to avoid memory issues
        const batchSize = 5;
        for (let i = 0; i < documents.length; i += batchSize) {
            const batch = documents.slice(i, i + batchSize);

            for (const doc of batch) {
                const docEmbedding = await this.createEmbedding(doc.text);
                if (docEmbedding.length > 0) {
                    const similarity = this.cosineSimilarity(queryEmbedding, docEmbedding);

                    // Add keyword boost
                    let boost = 0;
                    if (doc.text.toLowerCase().includes(queryLower)) {
                        boost += 0.2;
                    }

                    results.push({
                        text: doc.text,
                        score: similarity + boost,
                        metadata: doc.metadata
                    });
                }
            }
        }

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, topK)
            .filter(r => r.score > 0.3);
    }

    private keywordSearch(
        query: string,
        documents: Array<{ text: string; metadata?: any }>,
        topK: number
    ): SearchResult[] {
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

        const results: SearchResult[] = documents.map(doc => {
            const textLower = doc.text.toLowerCase();
            let score = 0;

            // Exact match
            if (textLower.includes(queryLower)) {
                score += 0.8;
            }

            // Word matches
            queryWords.forEach(word => {
                if (textLower.includes(word)) {
                    score += 0.2;
                }
            });

            return {
                text: doc.text,
                score: Math.min(score, 1.0),
                metadata: doc.metadata
            };
        });

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, topK)
            .filter(r => r.score > 0.1);
    }

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        if (vecA.length !== vecB.length || vecA.length === 0) return 0;

        let dot = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dot += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        return denominator > 0 ? dot / denominator : 0;
    }
}