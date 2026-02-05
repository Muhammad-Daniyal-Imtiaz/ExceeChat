// utils/pdfProcessor.ts

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

export interface PDFChunk {
    text: string;
    page: number;
    chunkIndex: number;
    metadata: {
        pageNumber: number;
        chunkNumber: number;
        totalChunks: number;
    };
}

export class PDFProcessor {
    static async extractTextFromPDF(file: File): Promise<string> {
        try {
            // Force global process object for PDF components
            if (typeof window !== 'undefined') {
                const g = window as any;
                g.process = g.process || {};
                g.process.env = g.process.env || { NODE_ENV: 'development' };
                g.process.browser = true;
            }

            // Dynamic import to avoid SSR errors
            // Use path to avoid issues with default exports in some versions
            const pdfjsLib = await import('pdfjs-dist');

            // Setup worker
            if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
            }

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';

            // Iterate over all pages
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                fullText += `\n\nPage ${i}:\n${pageText}`;
            }
            return fullText;
        } catch (error) {
            console.error("PDF Extraction Error:", error);
            throw new Error("Failed to extract text from PDF");
        }
    }

    static chunkText(text: string, chunkSize: number = 500, overlap: number = 50): PDFChunk[] {
        const chunks: PDFChunk[] = [];
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        let currentChunk = '';
        let chunkIndex = 0;
        let currentPage = 1; // Simplified page tracking

        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i].trim();

            // Check if sentence contains page number indicator (simple heuristic)
            if (sentence.toLowerCase().startsWith('page')) {
                const pageMatch = sentence.match(/page\s+(\d+)/i);
                if (pageMatch) currentPage = parseInt(pageMatch[1]);
            }

            if (currentChunk.length + sentence.length <= chunkSize) {
                currentChunk += (currentChunk ? ' ' : '') + sentence;
            } else {
                if (currentChunk) {
                    chunks.push({
                        text: currentChunk,
                        page: currentPage,
                        chunkIndex: chunkIndex++,
                        metadata: {
                            pageNumber: currentPage,
                            chunkNumber: chunkIndex,
                            totalChunks: 0 // Updated later
                        }
                    });
                }
                currentChunk = sentence;
            }
        }

        // Add last chunk
        if (currentChunk) {
            chunks.push({
                text: currentChunk,
                page: currentPage,
                chunkIndex: chunkIndex,
                metadata: {
                    pageNumber: currentPage,
                    chunkNumber: chunkIndex + 1,
                    totalChunks: chunkIndex + 1
                }
            });
        }

        // Update total count
        chunks.forEach(chunk => {
            chunk.metadata.totalChunks = chunks.length;
        });

        return chunks;
    }
}