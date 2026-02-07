import { put } from "@vercel/blob";
import { createClient } from "@vercel/edge-config";
import type { APIRoute } from "astro";
import crypto from "node:crypto";

export const POST: APIRoute = async ({ request }) => {
	try {
		// Initialize Edge Config safely inside the handler
		let edgeConfig;
		try {
			const edgeConfigConnection = import.meta.env.EDGE_CONFIG || process.env.EDGE_CONFIG;
			if (edgeConfigConnection) {
				edgeConfig = createClient(edgeConfigConnection);
			}
		} catch (e) {
			console.warn("Failed to initialize Edge Config client:", e);
		}

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
			return new Response(JSON.stringify({ error: "No image or message provided" }), {
				status: 400,
				headers: { "Content-Type": "application/json" }
			});
		}

		// 1. Process Image - Upload to Vercel Blob
		let publicUrl = "";
		let buffer: Buffer | undefined;

		if (imageFile) {
			try {
				buffer = Buffer.from(await imageFile.arrayBuffer());

				const blobToken = import.meta.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;

				if (blobToken) {
					const blob = await put(imageFile.name, imageFile, {
						access: "public",
						token: blobToken,
						addRandomSuffix: true,
					});
					publicUrl = blob.url;
				} else {
					console.warn("BLOB_READ_WRITE_TOKEN is missing, skipping upload.");
				}
			} catch (uploadError) {
				console.error("Blob upload failed:", uploadError);
			}
		}

		// 2. Edge Config Interaction
		if (edgeConfig) {
			try {
				const isActive = await edgeConfig.get("service_active");
				if (isActive === false) {
					return new Response(JSON.stringify({ error: "Service is currently under maintenance." }), {
						status: 503,
						headers: { "Content-Type": "application/json" }
					});
				}
			} catch (configError) {
				console.warn("Edge Config read failed", configError);
			}
		}

		// 3. Call Mastra Agent via API (Decoupled)
		// Try import.meta.env first, then process.env as fallback
		const mastraUrl = import.meta.env.MASTRA_API_URL || process.env.MASTRA_API_URL || "http://localhost:4111";

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
		if (publicUrl) {
			// Use the Vercel Blob URL so the external server can access it
			content.push({ type: "image", image: publicUrl });
		}

		try {
			const agentResponse = await fetch(`${mastraUrl}/api/agents/symbologyAgent/stream`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					messages: [
						{
							role: "user",
							content: content,
						},
					],
					threadId: threadId,
					resourceId: resourceId,
				}),
			});

			if (!agentResponse.ok) {
				const errorText = await agentResponse.text();
				console.error("Mastra API Error:", agentResponse.status, errorText);
				return new Response(JSON.stringify({ error: `Mastra API Error: ${errorText}` }), {
					status: 502,
					headers: { "Content-Type": "application/json" }
				});
			}

			// Return the stream directly to the client
			return new Response(agentResponse.body, {
				headers: {
					"Content-Type": "text/plain",
					"X-Thread-Id": threadId,
					"X-Resource-Id": resourceId,
					"X-Image-Url": publicUrl
				},
			});

		} catch (agentError) {
			console.error("Agent API request failed", agentError);
			return new Response(JSON.stringify({ error: "Agent analysis failed" }), {
				status: 500,
				headers: { "Content-Type": "application/json" }
			});
		}
	} catch (error) {
		console.error("Critical API Error:", error);
		return new Response(JSON.stringify({ error: "Internal Server Error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" }
		});
	}
};
