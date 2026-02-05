// src/app/worker.ts
import { pipeline, env } from "@huggingface/transformers";

// Global shim for process to prevent Transformers.js/onnxruntime crashes in browser
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

// Skip local model check
env.allowLocalModels = false;
env.useBrowserCache = true;

class EmbeddingPipeline {
    static model = 'Xenova/all-mpnet-base-v2';
    static instance: any = null;

    static async getInstance(progress_callback: any = null) {
        if (this.instance === null) {
            this.instance = await pipeline('feature-extraction', this.model, {
                progress_callback
            });
        }
        return this.instance;
    }
}

// Listen for messages from the main thread
self.onmessage = async (event) => {
    try {
        const { text, task } = event.data;

        if (task === 'init') {
            await EmbeddingPipeline.getInstance((x: any) => {
                self.postMessage(x);
            });
            self.postMessage({ status: 'ready' });
            return;
        }

        const extractor = await EmbeddingPipeline.getInstance();

        if (task === 'embed') {
            const output = await extractor(text, {
                pooling: 'mean',
                normalize: true,
            });

            self.postMessage({
                status: 'complete',
                output: Array.from(output.data),
                originalText: text
            });
        }
    } catch (error: any) {
        self.postMessage({
            status: 'error',
            error: error.message
        });
    }
};
