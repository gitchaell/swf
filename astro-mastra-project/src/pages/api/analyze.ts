import type { APIRoute } from 'astro';
import { mastra } from '../../mastra';
import { PrismaClient } from '../../generated/prisma/client'; // Import from generated path
import fs from 'fs';
import path from 'path';

// Initialize Prisma
const prisma = new PrismaClient();

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const language = formData.get('language') as string || 'EN';
    const mode = formData.get('mode') as string || 'SYMBOLOGY';

    if (!imageFile) {
      return new Response(JSON.stringify({ error: 'No image provided' }), { status: 400 });
    }

    // 1. Save Image to Disk
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const filename = `${Date.now()}-${imageFile.name}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');

    // Ensure dir exists
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);
    const publicUrl = `/uploads/${filename}`;

    // 2. Create Session in DB (Mocking DB interactions if Postgres isn't running)
    let sessionId = 'mock-session-id';
    try {
        const session = await prisma.session.create({
            data: {
                language: language as any,
                images: {
                    create: { url: publicUrl }
                }
            }
        });
        sessionId = session.id;
    } catch (dbError) {
        console.warn("DB Create failed (likely no DB running), proceeding with mock ID", dbError);
    }

    // 3. Call Mastra Agent
    const agent = mastra.getAgent("symbology-agent");

    // Construct Prompt
    const prompt = `Analyze this image in the context of ${mode}.
    Respond in ${language}.
    If Mode is SYMBOLOGY: Identify geometric patterns (straight lines vs curves) and relate to the Dakila knowledge base.
    If Mode is FREQUENCY: Analyze the visual wave patterns or colors as frequencies.
    `;

    // Agent generation
    // passing the image buffer directly if supported, or assuming text analysis for now if multimodal isn't straightforward in this version
    // The previous agent setup supports 'content' array for multimodal.

    let result;
    try {
        // We attempt to pass the image. If Mastra/AI SDK supports standard array content:
        result = await agent.generate([
            {
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    // Assuming Mastra supports image buffer or url.
                    // For local file, we might need to convert to base64 or pass as data url.
                    { type: 'image', image: buffer }
                ]
            }
        ]);
    } catch (agentError) {
        console.error("Agent generation failed", agentError);
        return new Response(JSON.stringify({ error: 'Agent analysis failed' }), { status: 500 });
    }

    // 4. Save Response to DB
    try {
        await prisma.message.create({
            data: {
                sessionId,
                role: 'assistant',
                content: result.text
            }
        });
    } catch (dbError) {
        console.warn("DB Save failed");
    }

    return new Response(JSON.stringify({ text: result.text }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
