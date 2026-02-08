import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Mistral } from '@mistralai/mistralai';

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

// Define the OCR response interface
interface OCRResponse {
  pages: {
    markdown: string;
    metadata?: any;
  }[];
}

// Create the OCR tool using Mastra's createTool pattern
export const mistralOCRTool = createTool({
  id: 'mistral-ocr',
  description: 'Extract text from PDF files using Mistral OCR',
  inputSchema: z.object({
    pdfBuffer: z.instanceof(Buffer).describe('The PDF file buffer to process'),
  }),
  outputSchema: z.object({
    extractedText: z.string().describe('The text extracted from the PDF'),
    pagesCount: z.number().describe('Number of pages processed'),
  }),
  execute: async ({ context }) => {
    return await processOCR(context.pdfBuffer);
  },
});

// Process function for OCR extraction
async function processOCR(pdf: Buffer): Promise<{ extractedText: string; pagesCount: number }> {
  try {
    if (!process.env.MISTRAL_API_KEY) {
      throw new Error('MISTRAL_API_KEY is not set in environment variables');
    }

    if (!pdf || pdf.length === 0) {
      throw new Error('Invalid PDF file: empty buffer');
    }

    const fileContent = new Uint8Array(pdf);

    // Upload the file to Mistral
    const uploadedFile = await client.files.upload({
      file: {
        fileName: 'uploaded_file.pdf',
        content: fileContent,
      },
      purpose: 'ocr',
    });

    // Get signed URL for uploaded file
    const signedURL = await client.files.getSignedUrl({ fileId: uploadedFile.id });

    // Process OCR
    const ocrResponse = await client.ocr.process({
      model: 'mistral-ocr-latest',
      document: { type: 'document_url', documentUrl: signedURL.url },
      includeImageBase64: true,
    });

    // Validate OCR response
    if (!ocrResponse || !ocrResponse.pages || !Array.isArray(ocrResponse.pages)) {
      throw new Error('Invalid OCR response format');
    }

    // Extract text from pages
    let extractedText = '';
    for (const page of ocrResponse.pages) {
      if (page.markdown) {
        extractedText += page.markdown + '\n\n';
      }
    }

    return {
      extractedText: extractedText.trim(),
      pagesCount: ocrResponse.pages.length,
    };
  } catch (error) {
    throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to extract text directly
export async function extractTextFromPDF(pdf: Buffer): Promise<string> {
  const result = await processOCR(pdf);
  return result.extractedText;
}
