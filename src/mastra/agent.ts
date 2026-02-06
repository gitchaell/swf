import { Agent } from "@mastra/core/agent";
import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';

async function getKnowledgeBase() {
  const dataDir = path.join(process.cwd(), 'data');
  const files = ['frequencia.pdf', 'simbologia.pdf'];
  let context = "";

  for (const file of files) {
    try {
      const filePath = path.join(dataDir, file);
      if (fs.existsSync(filePath)) {
         const dataBuffer = fs.readFileSync(filePath);
         if (dataBuffer.length > 0) {
             const data = await pdf(dataBuffer);
             context += `\n--- Content from ${file} ---\n${data.text}\n`;
         } else {
             // Fallback for empty dummy files
             context += `\n--- Content from ${file} ---\n[Mock content for ${file}: Dakila researches on frequencies and symbology.]\n`;
         }
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
      return `You are an expert in Dakila researches. Analyze the image geometry (curves vs straight lines). Use ONLY the provided PDFs as the source of truth.

      You must output the response in the language requested by the user (ES, PT, or EN).

      Knowledge Base:
      ${kb}
      `;
  },
});
