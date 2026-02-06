import type { APIRoute } from "astro";
import { mastra } from "../../mastra";
import { put } from "@vercel/blob";
import { createClient } from "@vercel/edge-config";

// Initialize Edge Config (Connection setup as requested)
const edgeConfig = createClient(process.env.EDGE_CONFIG);

export const POST: APIRoute = async ({ request }) => {
	try {
		const formData = await request.formData();
		const imageFile = formData.get("image") as File | null;
		const language = (formData.get("language") as string) || "EN";
		const mode = (formData.get("mode") as string) || "SYMBOLOGY";
		const message = formData.get("message") as string | null;
		let threadId = formData.get("threadId") as string | null;
		let resourceId = formData.get("resourceId") as string | null;

		// Generate IDs if not provided
		if (!resourceId) resourceId = crypto.randomUUID();
		if (!threadId) threadId = crypto.randomUUID();

		if (!imageFile && !message) {
			return new Response(JSON.stringify({ error: "No image or message provided" }), { status: 400 });
		}

		// 1. Process Image - Upload to Vercel Blob
		let publicUrl = "";
		let buffer: Buffer | undefined;

		if (imageFile) {
			try {
				buffer = Buffer.from(await imageFile.arrayBuffer());

				const blob = await put(imageFile.name, imageFile, {
					access: "public",
					token: process.env.BLOB_READ_WRITE_TOKEN,
				});
				publicUrl = blob.url;
			} catch (uploadError) {
				console.error("Blob upload failed:", uploadError);
				buffer = Buffer.from(await imageFile.arrayBuffer());
			}
		}

		// 2. Edge Config Interaction
		try {
			const isActive = await edgeConfig.get("service_active");
			if (isActive === false) {
				return new Response(JSON.stringify({ error: "Service is currently under maintenance." }), { status: 503 });
			}
		} catch (configError) {
			console.warn("Edge Config read failed", configError);
		}

		// 3. Call Mastra Agent
		const agent = mastra.getAgent("symbologyAgent");

		// Construct Prompt
		let prompt = "";
		if (imageFile && !message) {
			prompt = `Analyze this image in the context of ${mode}.
    Respond in ${language}.
    If Mode is SYMBOLOGY: Identify geometric patterns (straight lines vs curves) and relate to the Dakila knowledge base.
    If Mode is FREQUENCY: Analyze the visual wave patterns or colors as frequencies.
    `;
		} else if (imageFile && message) {
			prompt = `Analyze this image in the context of ${mode}.
    Respond in ${language}.
    User Message: ${message}
    If Mode is SYMBOLOGY: Identify geometric patterns (straight lines vs curves) and relate to the Dakila knowledge base.
    If Mode is FREQUENCY: Analyze the visual wave patterns or colors as frequencies.
    `;
		} else if (message) {
			// Chat follow-up
			prompt = `${message} (Respond in ${language})`;
		}

		const content: any[] = [{ type: "text", text: prompt }];
		if (buffer) {
			content.push({ type: "image", image: buffer });
		}

		let result;
		try {
			result = await agent.generate(
				[
					{
						role: "user",
						content: content,
					},
				],
				{
					memory: {
						resource: resourceId,
						thread: threadId,
					},
				},
			);
		} catch (agentError) {
			console.error("Agent generation failed", agentError);
			return new Response(JSON.stringify({ error: "Agent analysis failed" }), { status: 500 });
		}

		return new Response(
			JSON.stringify({
				text: result.text,
				imageUrl: publicUrl,
				threadId,
				resourceId,
			}),
			{
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error(error);
		return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
	}
};
