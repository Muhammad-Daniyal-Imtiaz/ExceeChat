// utils/embeddingEngine.ts
// (Keep your imports exactly as they were)
// ... imports ...

class EmbeddingEngine {
    static worker: Worker | null = null;
    static initializationPromise: Promise<void> | null = null;

    static async getInstance(progressCallback?: (progress: number) => void) {
        // ... (Keep existing getInstance logic)
        if (this.initializationPromise) return this.initializationPromise;
        
        this.initializationPromise = new Promise((resolve, reject) => {
            if (typeof window === 'undefined') {
                resolve();
                return;
            }

            if (!this.worker) {
                // CRITICAL: Ensure this points to the correct worker file
                this.worker = new Worker(new URL('../worker.ts', import.meta.url), {
                    type: 'module'
                });
            }

            const handler = (e: MessageEvent) => {
                const { status, progress, loaded, total } = e.data;
                if (status === 'progress' && progressCallback) {
                    const percent = total > 0 ? (loaded / total * 100) : (progress || 0);
                    progressCallback(percent);
                } else if (status === 'ready') {
                    // Don't remove listener
                    resolve();
                } else if (status === 'error') {
                    reject(new Error(e.data.error || 'Worker error'));
                }
            };

            this.worker.addEventListener('message', handler);
            this.worker.postMessage({ task: 'init' });
        });

        return this.initializationPromise;
    }

    static async embed(text: string): Promise<number[]> {
        if (typeof window === 'undefined') return [];
        if (!this.worker) await this.getInstance();

        return new Promise((resolve, reject) => {
            const handler = (e: MessageEvent) => {
                if (e.data.status === 'complete' && e.data.originalText === text) {
                    this.worker?.removeEventListener('message', handler);
                    resolve(e.data.output);
                } else if (e.data.status === 'error') {
                    this.worker?.removeEventListener('message', handler);
                    reject(new Error(e.data.error));
                }
            };

            this.worker?.addEventListener('message', handler);
            this.worker?.postMessage({ task: 'embed', text });
        });
    }

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