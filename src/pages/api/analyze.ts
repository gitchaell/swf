import type { APIRoute } from 'astro';
import { mastra } from '../../mastra';
import { put } from '@vercel/blob';
import { createClient } from '@vercel/edge-config';

// Initialize Edge Config (Connection setup as requested)
// Note: Edge Config is primarily for reading configuration data.
const edgeConfig = createClient(process.env.EDGE_CONFIG);

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const language = formData.get('language') as string || 'EN';
    const mode = formData.get('mode') as string || 'SYMBOLOGY';

    if (!imageFile) {
      return new Response(JSON.stringify({ error: 'No image provided' }), { status: 400 });
    }

    // 1. Process Image - Upload to Vercel Blob
    // This replaces the local buffer handling/placeholder logic
    let publicUrl = '';
    let buffer: Buffer;

    try {
        // We still need the buffer for the agent if it doesn't support URL directly yet,
        // or we can pass the URL if the agent tool supports it.
        // Assuming we upload to Blob for persistence/logging and pass buffer/url to agent.
        buffer = Buffer.from(await imageFile.arrayBuffer());

        const blob = await put(imageFile.name, imageFile, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN // Ensure this env var is set in Vercel
        });
        publicUrl = blob.url;
    } catch (uploadError) {
        console.error("Blob upload failed:", uploadError);
        // Fallback or just proceed if buffer is available, but we need to warn.
        // If blob fails (e.g. missing token), we continue with the analysis using the buffer.
        buffer = Buffer.from(await imageFile.arrayBuffer());
    }

    // 2. Edge Config Interaction
    // We can read a configuration value, e.g., to check if the service is active.
    // This demonstrates the connection.
    try {
        const isActive = await edgeConfig.get('service_active');
        if (isActive === false) {
             return new Response(JSON.stringify({ error: 'Service is currently under maintenance.' }), { status: 503 });
        }
    } catch (configError) {
        // Ignore config errors if not set up
        console.warn("Edge Config read failed", configError);
    }

    // 3. Call Mastra Agent
    const agent = mastra.getAgent("symbology-agent");

    // Construct Prompt
    const prompt = `Analyze this image in the context of ${mode}.
    Respond in ${language}.
    If Mode is SYMBOLOGY: Identify geometric patterns (straight lines vs curves) and relate to the Dakila knowledge base.
    If Mode is FREQUENCY: Analyze the visual wave patterns or colors as frequencies.
    `;

    let result;
    try {
        result = await agent.generate([
            {
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    // Pass the buffer (or URL if supported by specific agent integration).
                    // Using buffer is safer for immediate processing without downloading again.
                    { type: 'image', image: buffer }
                ]
            }
        ]);
    } catch (agentError) {
        console.error("Agent generation failed", agentError);
        return new Response(JSON.stringify({ error: 'Agent analysis failed' }), { status: 500 });
    }

    // 4. Response
    // We no longer save to Prisma.

    return new Response(JSON.stringify({ text: result.text, imageUrl: publicUrl }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
