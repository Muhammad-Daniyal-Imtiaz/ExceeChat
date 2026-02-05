// utils/pdfProcessor.ts
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
        // Note: For browser PDF parsing, you might need pdf-parse or similar
        // This is a simplified version
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    // In real implementation, use pdf-parse or similar library
                    // For now, return placeholder
                    resolve(`PDF content from ${file.name}`);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    static chunkText(text: string, chunkSize: number = 500, overlap: number = 50): PDFChunk[] {
        const chunks: PDFChunk[] = [];
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

        let currentChunk = '';
        let chunkIndex = 0;

        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i].trim();

            if (currentChunk.length + sentence.length <= chunkSize) {
                currentChunk += (currentChunk ? ' ' : '') + sentence;
            } else {
                if (currentChunk) {
                    chunks.push({
                        text: currentChunk,
                        page: 1, // Simplified
                        chunkIndex: chunkIndex++,
                        metadata: {
                            pageNumber: 1,
                            chunkNumber: chunkIndex,
                            totalChunks: 0 // Will update later
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
                page: 1,
                chunkIndex: chunkIndex,
                metadata: {
                    pageNumber: 1,
                    chunkNumber: chunkIndex + 1,
                    totalChunks: chunkIndex + 1
                }
            });
        }

        // Update total chunks
        chunks.forEach(chunk => {
            chunk.metadata.totalChunks = chunks.length;
        });

        return chunks;
    }
}