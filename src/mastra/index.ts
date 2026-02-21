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

try {
	// Ensure the index exists at startup to prevent "no such table" errors
	await vectorStore.createIndex({
		indexName: "embeddings",
		dimension: 768, // Using 768 to match google/text-embedding-004
	});
} catch (error) {
	console.error("Critical Error: Failed to ensure vector store index.", error);
}

export const mastra = new Mastra({
	agents: { symbologyAgent },
	vectors: { vectorStore },
	storage,
});
