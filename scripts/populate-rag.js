import { google } from "@ai-sdk/google";
import { embedMany, generateText } from "ai";
import { MDocument } from "@mastra/rag";
import "dotenv/config";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const OUTPUT_FILE = path.join(process.cwd(), "src/mastra/rag/knowledge.json");
const CACHE_FILE = path.join(DATA_DIR, "image_descriptions_cache.json");

// Extract image paths from Markdown content
function extractImagesFromMarkdown(mdContent, basePath) {
	const regex = /!\[.*?\]\((.*?)\)/g;
	const images = [];
	let match;
	while ((match = regex.exec(mdContent)) !== null) {
		// Resolve path relative to data dir
		const imgPath = match[1];
		// Handle both ./images/foo.jpg and images/foo.jpg
		const cleanPath = imgPath.startsWith("./") ? imgPath.slice(2) : imgPath;
		const fullPath = path.join(basePath, cleanPath);
		if (fs.existsSync(fullPath)) {
			images.push(fullPath);
		} else {
			console.warn(`Warning: Image not found at ${fullPath}`);
		}
	}
	return images;
}

// Load cache
let imageCache = {};
if (fs.existsSync(CACHE_FILE)) {
	try {
		imageCache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
		console.log(`Loaded ${Object.keys(imageCache).length} image descriptions from cache.`);
	} catch (e) {
		console.warn("Failed to load image cache:", e);
	}
}

async function populate() {
	// Check for API Key
	if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
		console.error("Error: GOOGLE_GENERATIVE_AI_API_KEY is not set in .env");
		process.exit(1);
	}

	const files = fs.readdirSync(DATA_DIR);
	const mdFiles = files.filter((f) => f.endsWith(".md"));

	if (mdFiles.length === 0) {
		console.log("No Markdown files found in data/");
		return;
	}

	console.log(`Found ${mdFiles.length} Markdown files. Processing...`);

	let allChunks = [];

	// Process Markdown files
	for (const file of mdFiles) {
		const filePath = path.join(DATA_DIR, file);
		const content = fs.readFileSync(filePath, "utf-8");

		console.log(`Processing ${file}...`);

		// 1. Process Text using Mastra MDocument
		const doc = MDocument.fromMarkdown(content);
		const textChunks = await doc.chunk({
			strategy: "markdown",
			maxSize: 1000,
			overlap: 100,
		});

		textChunks.forEach((chunk) => {
			allChunks.push({
				text: chunk.text,
				source: file,
				type: "text"
			});
		});
		console.log(`  - Extracted ${textChunks.length} text chunks`);

		// 2. Process Images
		const images = extractImagesFromMarkdown(content, DATA_DIR);
		console.log(`  - Found ${images.length} images. Generating descriptions...`);

		for (const imgPath of images) {
			const imgName = path.basename(imgPath);
			let description = "";

			if (imageCache[imgName]) {
				console.log(`    - Using cached description for ${imgName}`);
				description = imageCache[imgName];
			} else {
				try {
					console.log(`    - Generating description for ${imgName}...`);
					const imageBuffer = fs.readFileSync(imgPath);
					const result = await generateText({
						model: google("gemini-2.0-flash"),
						messages: [
							{
								role: "user",
								content: [
									{ type: "text", text: "Describe this image in detail. Focus on any geometric shapes, patterns, symbols, and colors you see. Explain potential meanings related to symbology or frequency if apparent." },
									{ type: "image", image: imageBuffer }
								]
							}
						]
					});

					description = `[IMAGE DESCRIPTION] Source: ${imgName}\n${result.text}`;
					imageCache[imgName] = description; // Update cache

					// Save cache incrementally to avoid data loss
					fs.writeFileSync(CACHE_FILE, JSON.stringify(imageCache, null, 2));

				} catch (err) {
					console.error(`    - Error processing image ${imgName}:`, err.message);
					continue;
				}
			}

			allChunks.push({
				text: description,
				source: file,
				originalImage: imgName,
				type: "image_description"
			});
		}
	}

	if (allChunks.length === 0) {
		console.log("No chunks generated. Exiting.");
		return;
	}

	console.log(`Generated ${allChunks.length} total chunks (text + images). Generating embeddings...`);

	// Use google.textEmbeddingModel for embeddings
	// Batch processing to avoid "at most 100 requests" error
	const BATCH_SIZE = 50;
	const knowledgeData = [];

	console.log(`Generating embeddings in batches of ${BATCH_SIZE}...`);

	for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
		const batch = allChunks.slice(i, i + BATCH_SIZE);
		console.log(`  - Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allChunks.length / BATCH_SIZE)}`);

		try {
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
						originalImage: chunk.originalImage,
					},
				});
			});
		} catch (err) {
			console.error(`  - Error generating embeddings for batch starting at index ${i}:`, err);
		}
	}

	if (knowledgeData.length > 0) {
		fs.writeFileSync(OUTPUT_FILE, JSON.stringify(knowledgeData, null, 2));
		console.log(`Successfully saved ${knowledgeData.length} records to ${OUTPUT_FILE}`);
	}
}

populate().catch(console.error);
