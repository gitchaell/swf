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

// Seed the vector store on startup
(async () => {
    try {
        const fs = await import("fs/promises");
        const path = await import("path");
        // Resolve absolute path to knowledge.json
        const knowledgePath = path.join(process.cwd(), "src/mastra/rag/knowledge.json");
        
        try {
            await fs.access(knowledgePath);
        } catch {
            console.warn(`Knowledge file not found at ${knowledgePath}`);
            return;
        }

        const fileContent = await fs.readFile(knowledgePath, "utf-8");
        const knowledge = JSON.parse(fileContent);

        if (Array.isArray(knowledge) && knowledge.length > 0) {
            // Create index if it doesn't exist
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
            console.log(`Vector store seeded with ${knowledge.length} records.`);
        }
    } catch (error) {
        console.error("Could not seed vector store:", error);
    }
})();

export const mastra = new Mastra({
	agents: { symbologyAgent },
	vectors: { vectorStore },
	storage,
	deployer: new VercelDeployer(),
});
