import { google } from "@ai-sdk/google";
import { embedMany, generateText } from "ai";
import "dotenv/config";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const OUTPUT_FILE = path.join(process.cwd(), "src/mastra/rag/knowledge.json");

// Split text into chunks
function chunkText(text, maxLength = 1000) {
	const chunks = [];
	let currentChunk = "";

	// Split by paragraphs first to keep context together
	const paragraphs = text.split(/\n\s*\n/);

	for (const paragraph of paragraphs) {
		if ((currentChunk + paragraph).length > maxLength) {
			if (currentChunk.trim()) chunks.push(currentChunk.trim());
			currentChunk = "";
		}
		currentChunk += paragraph + "\n\n";
	}
	if (currentChunk.trim()) {
		chunks.push(currentChunk.trim());
	}
	return chunks;
}

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

		// 1. Process Text
		const textChunks = chunkText(content);
		textChunks.forEach((chunk) => {
			allChunks.push({
				text: chunk,
				source: file,
				type: "text"
			});
		});
		console.log(`  - Extracted ${textChunks.length} text chunks`);

		// 2. Process Images
		const images = extractImagesFromMarkdown(content, DATA_DIR);
		console.log(`  - Found ${images.length} images. Generating descriptions...`);

		for (const imgPath of images) {
			try {
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

				const description = `[IMAGE DESCRIPTION] Source: ${path.basename(imgPath)}\n${result.text}`;
				// console.log(`    - Generated description for ${path.basename(imgPath)}`);

				allChunks.push({
					text: description,
					source: file,
					originalImage: path.basename(imgPath),
					type: "image_description"
				});

			} catch (err) {
				console.error(`    - Error processing image ${path.basename(imgPath)}:`, err.message);
			}
		}
	}

	if (allChunks.length === 0) {
		console.log("No chunks generated. Exiting.");
		return;
	}

	console.log(`Generated ${allChunks.length} total chunks (text + images). Generating embeddings...`);

	// Use google.textEmbeddingModel for embeddings
	try {
		const { embeddings } = await embedMany({
			model: google.textEmbeddingModel("gemini-embedding-001"),
			values: allChunks.map(c => c.text),
		});

		const knowledgeData = allChunks.map((chunk, i) => ({
			id: crypto.randomUUID(),
			text: chunk.text,
			vector: embeddings[i],
			metadata: {
				source: chunk.source,
				type: chunk.type,
				originalImage: chunk.originalImage
			}
		}));

		fs.writeFileSync(OUTPUT_FILE, JSON.stringify(knowledgeData, null, 2));
		console.log(`Successfully saved ${knowledgeData.length} records to ${OUTPUT_FILE}`);

	} catch (err) {
		console.error("Error generating embeddings:", err);
	}
}

populate().catch(console.error);
