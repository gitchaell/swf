import fs from "fs";
import markdownpdf from "markdown-pdf";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

async function convert() {
	const files = fs.readdirSync(DATA_DIR);
	const mdFiles = files.filter((f) => f.endsWith(".md"));

	if (mdFiles.length === 0) {
		console.log("No Markdown files found in data/");
		return;
	}

	console.log(`Found ${mdFiles.length} Markdown files. Converting...`);

	for (const file of mdFiles) {
		const inputPath = path.join(DATA_DIR, file);
		const outputPath = path.join(DATA_DIR, file.replace(".md", ".pdf"));

		console.log(`Converting ${file} -> ${path.basename(outputPath)}...`);

		markdownpdf()
			.from(inputPath)
			.to(outputPath, () => {
				console.log(`Done: ${outputPath}`);
			});
	}
}

convert().catch(console.error);
