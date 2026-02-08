import { mdToPdf } from 'md-to-pdf';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), "data");

async function convert() {
    const files = fs.readdirSync(DATA_DIR);
    const mdFiles = files.filter((f) => f.endsWith(".md"));

    if (mdFiles.length === 0) {
        console.log("No Markdown files found in data/");
        return;
    }

    console.log(`Found ${mdFiles.length} Markdown files. Converting to PDF...`);

    for (const file of mdFiles) {
        const filePath = path.join(DATA_DIR, file);
        const outPath = filePath.replace('.md', '.pdf');

        console.log(`Converting ${file} -> ${path.basename(outPath)}...`);

        try {
            await mdToPdf(
                { path: filePath },
                {
                    dest: outPath,
                    basedir: DATA_DIR,
                    css: `
                        body { font-family: sans-serif; }
                        img { max-width: 100%; height: auto; display: block; margin: 1em 0; }
                        h1, h2, h3 { margin-top: 1.5em; }
                    `,
                    pdf_options: {
                        format: 'A4',
                        margin: { top: '2cm', bottom: '2cm', left: '2cm', right: '2cm' },
                        printBackground: true
                    }
                }
            );
        } catch (err) {
            console.error(`Error converting ${file}:`, err);
        }
    }
    console.log("Conversion complete.");
}

convert().catch(console.error);
