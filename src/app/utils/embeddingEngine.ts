// utils/embeddingEngine.ts

// Global shim for process to prevent Transformers.js/onnxruntime crashes in browser/Turbopack
(function () {
    if (typeof globalThis !== 'undefined') {
        const g = globalThis as any;
        if (!g.process) {
            g.process = {
                env: { NODE_ENV: 'development' },
                cwd: () => '/',
                browser: true,
                version: '',
                versions: {},
                platform: 'browser',
                nextTick: (cb: any) => setTimeout(cb, 0)
            };
        } else if (!g.process.env) {
            g.process.env = { NODE_ENV: 'development' };
        }
    }
})();

class EmbeddingEngine {
    static instance: any = null;
    static model_name = 'Xenova/all-MiniLM-L6-v2'; // The 80MB model for semantic search

    // Singleton pattern: Downloads model once, keeps it in memory
    static async getInstance(progressCallback?: (progress: number) => void) {
        if (!this.instance) {
            console.log('Loading embedding model (approx 80MB)...');

            // Force global process object for Transformers.js
            if (typeof window !== 'undefined') {
                const g = window as any;
                g.process = g.process || {};
                g.process.env = g.process.env || { NODE_ENV: 'development' };
                g.process.browser = true;
                g.process.version = 'v20.0.0';
                g.process.versions = { node: '20.0.0' };
            }

            // Dynamic import with robust access
            const transformers = await import('@xenova/transformers');
            if (!transformers) throw new Error('Failed to import @xenova/transformers');

            const pipeline = transformers.pipeline;
            const env = transformers.env;

            if (!pipeline || !env) {
                console.error('Transformers components missing:', { pipeline: !!pipeline, env: !!env });
                throw new Error('AI components (pipeline/env) not found in package');
            }

            // Configure Transformers.js environment
            env.allowLocalModels = false;
            env.useBrowserCache = true;

            this.instance = await pipeline('feature-extraction', this.model_name, {
                progress_callback: (progress: any) => {
                    if (progress.status === 'progress' && progressCallback) {
                        const percent = progress.progress ? progress.progress * 100 : 0;
                        progressCallback(percent);
                    }
                },
            });
        }
        return this.instance;
    }

    // Convert text string into vector array
    static async embed(text: string, extractor: any): Promise<number[]> {
        const output = await extractor(text, {
            pooling: 'mean',
            normalize: true,
        });
        return Array.from(output.data);
    }

    // Calculate how similar two vectors are (0 = different, 1 = identical)
    static cosineSimilarity(vecA: number[], vecB: number[]): number {
        if (vecA.length !== vecB.length || vecA.length === 0) return 0;
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}

export default EmbeddingEngine;