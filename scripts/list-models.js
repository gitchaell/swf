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
			console.log("Available Content Generation Models:");
			if (d.models) {
				const genModels = d.models.filter(m =>
					m.supportedGenerationMethods &&
					m.supportedGenerationMethods.includes("generateContent") &&
					m.name.toLowerCase().includes("gemini")
				);

				if (genModels.length === 0) {
					console.log("No Gemini models with generateContent found.");
				} else {
					genModels.forEach(m => {
						console.log(`- ${m.name}`);
					});
				}
			} else {
				console.log("No models listed");
			}
		}
	})
	.catch(console.error);
