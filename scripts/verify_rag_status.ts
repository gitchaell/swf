import fs from 'fs';
import path from 'path';

const knowledgePath = path.join(process.cwd(), 'src/mastra/rag/knowledge.json');
const agentPath = path.join(process.cwd(), 'src/mastra/agent.ts');

console.log("--- RAG & Agent Verification ---");

// 1. Check Knowledge JSON
if (fs.existsSync(knowledgePath)) {
    const content = fs.readFileSync(knowledgePath, 'utf-8');
    try {
        const json = JSON.parse(content);
        console.log(`[OK] knowledge.json exists. Records: ${json.length}`);
        if (json.length === 0) {
            console.warn("[WARN] knowledge.json is empty. Ingestion likely skipped due to missing API keys.");
        }
    } catch (e) {
        console.error("[ERR] knowledge.json is invalid JSON.");
    }
} else {
    console.error("[ERR] knowledge.json missing.");
}

// 2. Check Agent Instructions
if (fs.existsSync(agentPath)) {
    const content = fs.readFileSync(agentPath, 'utf-8');
    if (content.includes("WORKFLOW:") && content.includes("Visual Analysis")) {
        console.log("[OK] Agent instructions updated with Visual Analysis workflow.");
    } else {
        console.error("[ERR] Agent instructions do not match expected update.");
    }
} else {
    console.error("[ERR] agent.ts missing.");
}

console.log("--- End Verification ---");
