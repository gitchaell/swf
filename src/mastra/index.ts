import { Mastra } from "@mastra/core";
import { LibSQLVector, LibSQLStore } from "@mastra/libsql";
import { VercelDeployer } from "@mastra/deployer-vercel";
import { symbologyAgent } from "./agent";

const vectorStore = new LibSQLVector({
	id: "vector-store",
	url: ":memory:",
});

const storage = new LibSQLStore({
	id: "mastra-storage",
	url: ":memory:",
});

// Seed the vector store on startup
(async () => {
	try {
		const knowledgeModule = await import("./rag/knowledge.json");
		const knowledge = knowledgeModule.default || knowledgeModule;

		if (Array.isArray(knowledge) && knowledge.length > 0) {
			await vectorStore.createIndex({
				indexName: "embeddings",
				dimension: 768,
			});

			await vectorStore.upsert({
				indexName: "embeddings",
				vectors: knowledge.map((k: any) => k.vector),
				metadata: knowledge.map((k: any) => ({
					text: k.text,
					source: k.metadata.source,
				})),
				ids: knowledge.map((k: any) => k.id),
			});
			console.log("Vector store seeded.");
		}
	} catch (error) {
		console.warn("Could not seed vector store (knowledge.json might be empty or missing)", error);
	}
})();

export const mastra = new Mastra({
	agents: { symbologyAgent },
	vectors: { vectorStore },
	storage,
	deployer: new VercelDeployer(),
});
