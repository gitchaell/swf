import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';
import { MDocument } from '@mastra/rag';
import { embedMany } from 'ai';
import { google } from '@ai-sdk/google';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

async function ingest() {
  const dataDir = path.join(process.cwd(), 'data');
  const outputDir = path.join(process.cwd(), 'src/mastra/rag');
  const outputFile = path.join(outputDir, 'knowledge.json');

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error('Error: GOOGLE_GENERATIVE_AI_API_KEY is not set.');
    process.exit(1);
  }

  // Ensure output dir exists
  try {
    await fs.access(outputDir);
  } catch {
    await fs.mkdir(outputDir, { recursive: true });
  }

  let files;
  try {
    files = await fs.readdir(dataDir);
  } catch (e) {
    console.warn("No data directory found or empty.");
    return;
  }

  const allChunks: any[] = [];

  for (const file of files) {
    const filePath = path.join(dataDir, file);
    let text = '';

    if (file.endsWith('.pdf')) {
      const buffer = await fs.readFile(filePath);
      const data = await pdf(buffer);
      text = data.text;
    } else if (file.endsWith('.md')) {
      text = await fs.readFile(filePath, 'utf-8');
    } else {
      continue;
    }

    console.log(`Processing ${file}...`);

    const doc = MDocument.fromText(text);
    const chunks = await doc.chunk({
      strategy: 'recursive',
      maxSize: 512,
      overlap: 50,
    });

    console.log(`Generated ${chunks.length} chunks for ${file}`);

    // Generate embeddings
    try {
        const { embeddings } = await embedMany({
        model: google.textEmbeddingModel('text-embedding-004'),
        values: chunks.map(c => c.text),
        });

        // Combine chunk with embedding and metadata
        chunks.forEach((chunk, i) => {
        allChunks.push({
            id: `${file}-${i}`,
            text: chunk.text,
            vector: embeddings[i],
            metadata: {
            source: file,
            }
        });
        });
    } catch (error) {
        console.error(`Failed to generate embeddings for ${file}:`, error);
    }
  }

  await fs.writeFile(outputFile, JSON.stringify(allChunks, null, 2));
  console.log(`Saved ${allChunks.length} vectors to ${outputFile}`);
}

ingest().catch(console.error);
