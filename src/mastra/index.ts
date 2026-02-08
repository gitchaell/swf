import { Mastra } from "@mastra/core";
import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import { symbologyAgent } from "./agent";

const vectorStore = new LibSQLVector({
	id: "vector-store",
	url: process.env.LIBSQL_URL || ":memory:",
	authToken: process.env.LIBSQL_AUTH_TOKEN,
});

const storage = new LibSQLStore({
	id: "mastra-storage",
	url: process.env.LIBSQL_URL || ":memory:",
	authToken: process.env.LIBSQL_AUTH_TOKEN,
});

// Static import ensures bundle inclusion for Vercel
import knowledge from "./rag/knowledge.json";

// Seed the vector store on startup
// Using top-level await to ensure this completes before the module exports 'mastra'
try {
	// Robust check for knowledge data (handle both direct array and module default export)
	// @ts-ignore
	const knowledgeData = Array.isArray(knowledge) ? knowledge : (knowledge?.default as any[]);

	// Always create index to prevent "no such table" errors in agent
	await vectorStore.createIndex({
		indexName: "embeddings",
		dimension: 768, // text-embedding-004 dimension
	});

	if (!Array.isArray(knowledgeData)) {
		console.error("Critical Warning: 'knowledge.json' is not an array. Vector store seeding skipped.");
	} else if (knowledgeData.length === 0) {
		console.warn("Warning: 'knowledge.json' is empty. Vector store seeding skipped.");
	} else {
		// Insert data
		await vectorStore.upsert({
			indexName: "embeddings",
			vectors: knowledgeData.map((k: any) => k.vector),
			metadata: knowledgeData.map((k: any) => ({
				text: k.text,
				source: k.metadata.source,
				originalImage: k.metadata.originalImage, // meaningful if present
			})),
			ids: knowledgeData.map((k: any) => k.id),
		});
		console.log(`Vector store seeded with ${knowledgeData.length} records.`);
	}
} catch (error) {
	console.error("Critical Error: Failed to seed vector store.", error);
}

export const mastra = new Mastra({
	agents: { symbologyAgent },
	vectors: { vectorStore },
	storage,
});
