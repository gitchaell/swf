import { mdToPdf } from 'md-to-pdf';

export async function convertMdToPdfBuffer(mdContent: string, basedir: string): Promise<Buffer> {
	try {
		const pdf = await mdToPdf(
			{ content: mdContent },
			{
				basedir: basedir,
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

		if (!pdf || !pdf.content) {
			throw new Error("Failed to generate PDF buffer");
		}

		return pdf.content;
	} catch (error) {
		console.error("Error converting Markdown to PDF:", error);
		throw error;
	}
}
