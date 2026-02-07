import { Mastra } from "@mastra/core";
import { VercelDeployer } from "@mastra/deployer-vercel";
import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import { symbologyAgent } from "./agent";

const vectorStore = new LibSQLVector({
	id: "vector-store",
	url: ":memory:",
});

const storage = new LibSQLStore({
	id: "mastra-storage",
	url: ":memory:",
});

// Static import ensures bundle inclusion for Vercel
import knowledge from "./rag/knowledge.json";

// Seed the vector store on startup
// Using top-level await to ensure this completes before the module exports 'mastra'
try {
	if (Array.isArray(knowledge) && knowledge.length > 0) {
		// Create index explicitly
		await vectorStore.createIndex({
			indexName: "embeddings",
			dimension: 768,
		});

		// Insert data
		await vectorStore.upsert({
			indexName: "embeddings",
			vectors: knowledge.map((k: any) => k.vector),
			metadata: knowledge.map((k: any) => ({
				text: k.text,
				source: k.metadata.source,
				originalImage: k.metadata.originalImage, // meaningful if present
			})),
			ids: knowledge.map((k: any) => k.id),
		});
		console.log(`Vector store seeded with ${knowledge.length} records.`);
	}
} catch (error) {
	console.error("Critical Error: Failed to seed vector store.", error);
}

export const mastra = new Mastra({
	agents: { symbologyAgent },
	vectors: { vectorStore },
	storage,
	deployer: new VercelDeployer(),
});
