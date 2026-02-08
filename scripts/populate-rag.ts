import { google } from "@ai-sdk/google";
import { MDocument } from "@mastra/rag";
import { embedMany } from "ai";
import "dotenv/config";
import fs from "fs";
import path from "path";
import { convertMdToPdfBuffer } from "./utils/convertMdToPdf";
import { extractTextFromPDF } from "../src/mastra/tools/mistralOCR";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const OUTPUT_FILE = path.join(process.cwd(), "src/mastra/rag/knowledge.json");

async function populate() {
	// Check for API Keys
	if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
		console.error("Error: GOOGLE_GENERATIVE_AI_API_KEY is not set in .env");
		process.exit(1);
	}
    // Check MISTRAL_API_KEY if we are going to use it, but the tool checks it inside.
    if (!process.env.MISTRAL_API_KEY) {
        console.warn("Warning: MISTRAL_API_KEY is not set. OCR will fail if run.");
    }

	const files = fs.readdirSync(DATA_DIR);
	const mdFiles = files.filter((f) => f.endsWith(".md"));

	if (mdFiles.length === 0) {
		console.log("No Markdown files found in data/");
		return;
	}

	console.log(`Found ${mdFiles.length} Markdown files. Processing with Mistral OCR...`);

	let allChunks: any[] = [];

	// Process Markdown files
	for (const file of mdFiles) {
		const filePath = path.join(DATA_DIR, file);
		const content = fs.readFileSync(filePath, "utf-8");

		console.log(`Processing ${file}...`);

        try {
            // 1. Convert Markdown to PDF
            console.log(`  - Converting to PDF...`);
            const pdfBuffer = await convertMdToPdfBuffer(content, DATA_DIR);

            // 2. Process with Mistral OCR
            console.log(`  - Sending to Mistral OCR...`);
            const extractedText = await extractTextFromPDF(pdfBuffer);

            console.log(`  - Extracted ${extractedText.length} characters from OCR.`);

            // 3. Chunk the extracted text using MDocument (or simple chunking since it's now flat text)
            // Using MDocument with recursive strategy for better context handling
            const doc = MDocument.fromMarkdown(extractedText);
            const textChunks = await doc.chunk({
                strategy: "recursive",
                maxSize: 1000,
                overlap: 100,
            });

            textChunks.forEach((chunk) => {
                allChunks.push({
                    text: chunk.text,
                    source: file,
                    type: "ocr_text"
                });
            });
            console.log(`  - Generated ${textChunks.length} chunks from OCR text.`);

        } catch (err) {
            console.error(`  - Error processing ${file}:`, err);
        }
	}

	if (allChunks.length === 0) {
		console.log("No chunks generated. Exiting.");
		return;
	}

	console.log(`Generated ${allChunks.length} total chunks. Generating embeddings...`);

	// Use google.textEmbeddingModel for embeddings
	// Batch processing
	const BATCH_SIZE = 50;
	const knowledgeData: any[] = [];

	console.log(`Generating embeddings in batches of ${BATCH_SIZE}...`);

	for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
		const batch = allChunks.slice(i, i + BATCH_SIZE);
		console.log(`  - Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allChunks.length / BATCH_SIZE)}`);

		try {
            // Use text-embedding-004 as per memory instruction for consistency
			const { embeddings } = await embedMany({
				model: google.textEmbeddingModel("text-embedding-004"),
				values: batch.map((c) => c.text),
			});

			batch.forEach((chunk, idx) => {
				knowledgeData.push({
					id: crypto.randomUUID(),
					text: chunk.text,
					vector: embeddings[idx],
					metadata: {
						source: chunk.source,
						type: chunk.type,
					},
				});
			});
		} catch (err) {
			console.error(`  - Error generating embeddings for batch starting at index ${i}:`, err);
		}
	}

	if (knowledgeData.length > 0) {
        // Create directory if it doesn't exist
        const dir = path.dirname(OUTPUT_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
		fs.writeFileSync(OUTPUT_FILE, JSON.stringify(knowledgeData, null, 2));
		console.log(`Successfully saved ${knowledgeData.length} records to ${OUTPUT_FILE}`);
	}
}

populate().catch(console.error);
