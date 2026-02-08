import { google } from "@ai-sdk/google";
import { MDocument } from "@mastra/rag";
import { Mistral } from '@mistralai/mistralai';
import { embedMany } from "ai";
import crypto from "crypto";
import "dotenv/config";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const OUTPUT_FILE = path.join(process.cwd(), "src/mastra/rag/knowledge.json");

// Define OCR logic locally here instead of importing a tool that is unused elsewhere
async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
	const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

	const fileContent = new Uint8Array(pdfBuffer);
	const uploadedFile = await client.files.upload({
		file: {
			fileName: 'uploaded_file.pdf',
			content: fileContent,
		},
		purpose: 'ocr',
	});

	const signedURL = await client.files.getSignedUrl({ fileId: uploadedFile.id });

	const ocrResponse = await client.ocr.process({
		model: 'mistral-ocr-latest',
		document: { type: 'document_url', documentUrl: signedURL.url },
		includeImageBase64: true,
		bboxAnnotationFormat: {
			type: "json_schema",
			jsonSchema: {
				name: "image_analysis",
				schemaDefinition: {
					type: "object",
					title: "ImageAnalysis",
					properties: {
						visual_description: {
							type: "string",
							description: "Describe in detail the shapes, structures, colors, textures, and visual composition of the image."
						},
						text_content: {
							type: "string",
							description: "Transcribe any visible text within the image, if it exists."
						},
						interpretation: {
							type: "string",
							description: "Analyze the semantic meaning, the purpose of the image, and its relationship to the document's context."
						},
						key_entities: {
							type: "array",
							items: { type: "string" },
							description: "List the key entities, objects, or figures identified in the image."
						}
					},
					required: ["visual_description", "interpretation", "key_entities"]
				}
			}
		}
	});

	if (!ocrResponse || !ocrResponse.pages || !Array.isArray(ocrResponse.pages)) {
		throw new Error('Invalid OCR response format');
	}

	let extractedText = '';
	for (const page of ocrResponse.pages) {
		if (page.markdown) {
			extractedText += page.markdown + '\n\n';
		}
	}
	return extractedText.trim();
}

async function populate() {
	if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
		console.error("Error: GOOGLE_GENERATIVE_AI_API_KEY is not set in .env");
		process.exit(1);
	}
	if (!process.env.MISTRAL_API_KEY) {
		console.warn("Warning: MISTRAL_API_KEY is not set. OCR will fail.");
		process.exit(1);
	}

	const files = fs.readdirSync(DATA_DIR);
	const pdfFiles = files.filter((f) => f.endsWith(".pdf"));

	if (pdfFiles.length === 0) {
		console.log("No PDF files found in data/. Run `npm run rag:convert` first.");
		return;
	}

	console.log(`Found ${pdfFiles.length} PDF files. Processing with Mistral OCR...`);

	let allChunks: any[] = [];

	for (const file of pdfFiles) {
		const filePath = path.join(DATA_DIR, file);
		const pdfBuffer = fs.readFileSync(filePath);

		console.log(`Processing ${file}...`);

		try {
			console.log(`  - Sending to Mistral OCR...`);
			const extractedText = await extractTextFromPDF(pdfBuffer);

			console.log(`  - Extracted ${extractedText.length} characters from OCR.`);

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
			console.log(`  - Generated ${textChunks.length} chunks.`);

		} catch (err) {
			console.error(`  - Error processing ${file}:`, err);
		}
	}

	if (allChunks.length === 0) {
		console.log("No chunks generated. Exiting.");
		return;
	}

	console.log(`Generated ${allChunks.length} total chunks. Generating embeddings...`);

	const BATCH_SIZE = 50;
	const knowledgeData: any[] = [];

	for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
		const batch = allChunks.slice(i, i + BATCH_SIZE);
		console.log(`  - Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allChunks.length / BATCH_SIZE)}`);

		try {
			const { embeddings } = await embedMany({
				model: google.textEmbeddingModel("gemini-embedding-001"),
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
		const dir = path.dirname(OUTPUT_FILE);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		fs.writeFileSync(OUTPUT_FILE, JSON.stringify(knowledgeData, null, 2));
		console.log(`Successfully saved ${knowledgeData.length} records to ${OUTPUT_FILE}`);
	}
}

populate().catch(console.error);
