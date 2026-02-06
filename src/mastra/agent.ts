import { Agent } from "@mastra/core/agent";
import { ModelRouterEmbeddingModel } from "@mastra/core/llm";
import { createVectorQueryTool } from "@mastra/rag";

// Explicitly check for API Key to ensure it is configured
if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
	throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set in environment variables.");
}

const vectorQueryTool = createVectorQueryTool({
	vectorStoreName: "vectorStore",
	indexName: "embeddings",
	model: new ModelRouterEmbeddingModel("google/text-embedding-004"),
});

export const symbologyAgent = new Agent({
	id: "symbology-agent",
	name: "Symbology & Frequency Analyzer",
	model: "google/gemini-1.5-pro",
	instructions: `You are an expert in Dakila researches. You have access to a Knowledge Base via the vectorQueryTool.

      Your goal is to answer the user's questions or analyze concepts using the theoretical information found in the Knowledge Base.

      ALWAYS use the vectorQueryTool to search for relevant information before answering.
      Use ONLY the provided Knowledge Base as the source of truth.
      If the information is not in the Knowledge Base, admit it.

      Analyze the image geometry (curves vs straight lines) or frequency concepts based on the retrieved context.

      You must output the response in the language requested by the user (ES, PT, or EN).
      `,
	tools: {
		vectorQueryTool,
	},
});
