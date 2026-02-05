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

    async initialize(options?: { onProgress?: (progress: number) => void }) {
        if (this.isInitialized) return;

        try {
            // Dynamic import to avoid Turbopack issues
            const { pipeline, env } = await import('@xenova/transformers');

            // Configure environment for browser
            env.allowLocalModels = false;
            env.useBrowserCache = true;

            this.extractor = await pipeline(
                'feature-extraction',
                this.modelName,
                {
                    quantized: true,
                    progress_callback: (progress: any) => {
                        const percent = progress.total > 0 ? (progress.loaded / progress.total * 100) : 0;
                        console.log(`Downloading embedding model: ${percent.toFixed(1)}%`);
                        if (options?.onProgress) {
                            options.onProgress(percent);
                        }
                    }
                }
            );

            this.isInitialized = true;
            console.log('Embedding model loaded successfully');
        } catch (error) {
            console.error('Failed to load embedding model:', error);
            throw new Error('Failed to initialize AI model. Please check your internet connection.');
        }
    }

    async createEmbedding(text: string): Promise<number[]> {
        if (!this.isInitialized) {
            try {
                await this.initialize();
            } catch (e) {
                console.warn('Initialization failed, returning empty embedding');
                return [];
            }
        }

        if (!this.extractor) {
            console.warn('Embedding model not available');
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

        let queryEmbedding: number[] = [];
        try {
            queryEmbedding = await this.createEmbedding(query);
        } catch (e) {
            console.warn('Semantic search falling back to keyword search due to model error');
        }

        // Fallback to keyword search if embedding fails
        if (queryEmbedding.length === 0) {
            return this.keywordSearch(query, documents, topK);
        }

        const results: SearchResult[] = [];
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

        // Process in batches
        const batchSize = 10;
        for (let i = 0; i < documents.length; i += batchSize) {
            const batch = documents.slice(i, i + batchSize);

            for (const doc of batch) {
                // Hybrid Score Calculation
                let score = 0;

                // 1. Semantic Score (Cosine Similarity)
                const docEmbedding = await this.createEmbedding(doc.text); // Note: In a real prod app, store these!
                if (docEmbedding.length > 0) {
                    const similarity = this.cosineSimilarity(queryEmbedding, docEmbedding);
                    score += similarity * 0.7; // 70% weight to semantic
                }

                // 2. Keyword Match Boost (Exact & Partial)
                const docLower = doc.text.toLowerCase();
                let keywordScore = 0;

                if (docLower.includes(queryLower)) {
                    keywordScore += 0.3; // Specific phrase match
                } else {
                    // Count matching words
                    const matchedWords = queryWords.filter(w => docLower.includes(w));
                    if (matchedWords.length > 0) {
                        keywordScore += (matchedWords.length / queryWords.length) * 0.2;
                    }
                }

                score += keywordScore; // Add keyword score

                if (score > 0.25) { // Threshold
                    results.push({
                        text: doc.text,
                        score: score,
                        metadata: doc.metadata
                    });
                }
            }
        }

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
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
                score += 1.0;
            }

            // Word matches
            let matchCount = 0;
            queryWords.forEach(word => {
                if (textLower.includes(word)) {
                    matchCount++;
                }
            });

            if (matchCount > 0) {
                score += (matchCount / queryWords.length) * 0.5;
            }

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