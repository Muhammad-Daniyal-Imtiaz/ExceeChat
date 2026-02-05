// utils/embeddingEngine.ts

class EmbeddingEngine {
    // Singleton Instance: Ensures we only have one worker
    static worker: Worker | null = null;
    static initializationPromise: Promise<void> | null = null;

    /**
     * Initialize the Web Worker and load the BGE model.
     * Only runs once per session (cached in memory).
     */
    static async getInstance(progressCallback?: (progress: number) => void) {
        // If already initialized, return the promise
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        // Initialize for the first time
        this.initializationPromise = new Promise((resolve, reject) => {
            // Check if we are in a browser environment
            if (typeof window === 'undefined') {
                resolve();
                return;
            }

            try {
                // Create the Web Worker
                // Pointing to worker.ts in the same folder structure
                this.worker = new Worker(new URL('../worker.ts', import.meta.url), {
                    type: 'module'
                });

                // Listen for messages from the Worker
                const handler = (e: MessageEvent) => {
                    const { status, progress, loaded, total } = e.data;

                    // 1. Progress Updates (Downloading Model)
                    if (status === 'progress' && progressCallback) {
                        // Calculate percentage based on loaded/total or raw progress
                        const percent = total > 0 ? (loaded / total * 100) : (progress || 0);
                        progressCallback(percent);
                    } 
                    // 2. Ready Status
                    else if (status === 'ready') {
                        // We do NOT remove the listener here because we might need it for 'progress' later
                        // or we might remove it and let 'embed' handle its own listeners.
                        // However, for initialization, we just need to know it's ready.
                        resolve();
                    } 
                    // 3. Error Handling
                    else if (status === 'error') {
                        this.worker?.removeEventListener('message', handler);
                        reject(new Error(e.data.error || 'Worker error during initialization'));
                    }
                };

                this.worker.addEventListener('message', handler);
                
                // Tell worker to start loading the model
                this.worker.postMessage({ task: 'init' });

            } catch (error) {
                reject(error);
            }
        });

        return this.initializationPromise;
    }

    /**
     * Convert a text string into a vector (embeddings).
     */
    static async embed(text: string): Promise<number[]> {
        if (typeof window === 'undefined') return [];
        
        // Ensure worker is initialized before asking for embed
        if (!this.worker) {
            await this.getInstance();
        }

        return new Promise((resolve, reject) => {
            const handler = (e: MessageEvent) => {
                // Match the response to the specific text request
                if (e.data.status === 'complete' && e.data.originalText === text) {
                    this.worker?.removeEventListener('message', handler);
                    resolve(e.data.output);
                } else if (e.data.status === 'error') {
                    this.worker?.removeEventListener('message', handler);
                    reject(new Error(e.data.error || 'Worker error during embedding'));
                }
            };

            this.worker?.addEventListener('message', handler);
            this.worker?.postMessage({ task: 'embed', text });
        });
    }

    /**
     * Mathematical calculation of similarity between two vectors.
     * Returns a value between 0 (dissimilar) and 1 (identical).
     */
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