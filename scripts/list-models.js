import "dotenv/config";
if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
	console.error("GOOGLE_GENERATIVE_AI_API_KEY is missing");
	process.exit(1);
}

const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

fetch(url)
	.then(r => r.json())
	.then(d => {
		if (d.error) {
			console.error("Error from API:", d.error);
		} else {
			console.log("Available Embedding Models:");
			if (d.models) {
				const embeddingModels = d.models.filter(m => m.name.toLowerCase().includes("embedding"));
				if (embeddingModels.length === 0) {
					console.log("No embedding models found.");
				} else {
					embeddingModels.forEach(m => {
						console.log(`- ${m.name}`);
						if (m.supportedGenerationMethods) {
							console.log(`  Methods: ${m.supportedGenerationMethods.join(", ")}`);
						}
					});
				}
			} else {
				console.log("No models listed");
			}
		}
	})
	.catch(console.error);
