import { Agent } from "@mastra/core/agent";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

// Explicitly check for API Key to ensure it is configured
if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
	throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set in environment variables.");
}

export async function getKnowledgeBase() {
	const dataDir = path.join(process.cwd(), "data");
	// Ensure directory exists
	if (!fs.existsSync(dataDir)) {
		return "";
	}

	const files = fs.readdirSync(dataDir).filter((file) => file.endsWith(".pdf") || file.endsWith(".md"));
	let context = "";

	for (const file of files) {
		try {
			const filePath = path.join(dataDir, file);
			const dataBuffer = fs.readFileSync(filePath);

			if (file.endsWith(".pdf")) {
				if (dataBuffer.length > 0) {
					const data = await pdf(dataBuffer);
					context += `\n--- Content from ${file} ---\n${data.text}\n`;
				}
			} else if (file.endsWith(".md")) {
				const text = dataBuffer.toString("utf-8");
				context += `\n--- Content from ${file} ---\n${text}\n`;
			}
		} catch (error) {
			console.warn(`Failed to read ${file}`, error);
		}
	}
	return context;
}

export const symbologyAgent = new Agent({
	id: "symbology-agent",
	name: "Symbology & Frequency Analyzer",
	model: "google/gemini-1.5-pro",
	instructions: async () => {
		const kb = await getKnowledgeBase();
		return `You are an expert in Dakila researches. Analyze the image geometry (curves vs straight lines). Use ONLY the provided Knowledge Base as the source of truth.

      You must output the response in the language requested by the user (ES, PT, or EN).

      Knowledge Base:
      ${kb}
      `;
	},
});
