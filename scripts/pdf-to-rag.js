import { google } from "@ai-sdk/google";
import { embedMany } from "ai";
import "dotenv/config";
import fs from "fs";
import path from "path";

// Import the named export PDFParse
import { PDFParse } from "pdf-parse";

const DATA_DIR = path.join(process.cwd(), "data");
const OUTPUT_FILE = path.join(process.cwd(), "src/mastra/rag/knowledge.json");

// Split text into chunks
function chunkText(text, maxLength = 1000) {
	const chunks = [];
	let currentChunk = "";

	const sentences = text.split(/(?<=[.?!])\s+/);

	for (const sentence of sentences) {
		if ((currentChunk + sentence).length > maxLength) {
			chunks.push(currentChunk.trim());
			currentChunk = "";
		}
		currentChunk += sentence + " ";
	}
	if (currentChunk.trim()) {
		chunks.push(currentChunk.trim());
	}
	return chunks;
}

async function populate() {
	// Check for API Key
	if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
		console.error("Error: GOOGLE_GENERATIVE_AI_API_KEY is not set in .env");
		process.exit(1);
	}

	const files = fs.readdirSync(DATA_DIR);
	const pdfFiles = files.filter((f) => f.endsWith(".pdf"));

	if (pdfFiles.length === 0) {
		console.log("No PDF files found in data/");
		return;
	}

	console.log(`Found ${pdfFiles.length} PDF files. Processing...`);

	let allChunks = [];

	for (const file of pdfFiles) {
		const filePath = path.join(DATA_DIR, file);
		const dataBuffer = fs.readFileSync(filePath);

		console.log(`Extracting text from ${file}...`);

		let parser;
		try {
			// Instantiate parser with data buffer
			parser = new PDFParse({ data: dataBuffer });

			// Extract text
			const result = await parser.getText();
			const text = result.text; // Text is in result.text according to CLI

			if (!text || text.trim().length === 0) {
				console.warn(`Warning: No text extracted from ${file}. It might be image-only.`);
				continue;
			}

			const chunks = chunkText(text);

			chunks.forEach((chunk) => {
				allChunks.push({
					text: chunk,
					source: file,
				});
			});

		} catch (err) {
			console.error(`Error parsing ${file}:`, err);
		} finally {
			// Clean up parser if created
			if (parser) {
				try {
					await parser.destroy();
				} catch (e) {
					console.warn("Failed to destroy parser", e);
				}
			}
		}
	}

	if (allChunks.length === 0) {
		console.log("No text chunks generated. Exiting.");
		return;
	}

	console.log(`Generated ${allChunks.length} text chunks. Generating embeddings...`);

	// Use google.textEmbeddingModel for embeddings
	// Discovered available model via list-models.js: models/gemini-embedding-001
	const { embeddings } = await embedMany({
		model: google.textEmbeddingModel("gemini-embedding-001"),
		values: allChunks.map(c => c.text),
	});

	const knowledgeData = allChunks.map((chunk, i) => ({
		id: crypto.randomUUID(),
		text: chunk.text,
		vector: embeddings[i],
		metadata: {
			source: chunk.source
		}
	}));

	fs.writeFileSync(OUTPUT_FILE, JSON.stringify(knowledgeData, null, 2));
	console.log(`Successfully saved ${knowledgeData.length} records to ${OUTPUT_FILE}`);
}

populate().catch(console.error);
