import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export const generatePDF = async (element: HTMLDivElement | null) => {
	if (!element) return

	try {
		const canvas = await html2canvas(element, {
			scale: 2,
			useCORS: true,
			logging: false,
			windowWidth: element.scrollWidth,
			windowHeight: element.scrollHeight
		})

		const imgData = canvas.toDataURL('image/png')
		const pdf = new jsPDF('p', 'mm', 'a4')

		const imgWidth = 210
		const pageHeight = 297
		const imgHeight = (canvas.height * imgWidth) / canvas.width

		let heightLeft = imgHeight
		let position = 0

		pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
		heightLeft -= pageHeight

		while (heightLeft > 0) {
			position -= pageHeight // Move up by one page height
			pdf.addPage()
			pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
			heightLeft -= pageHeight
		}

		pdf.save('dakila-analysis-report.pdf')
	} catch (error) {
		console.error('Error generating PDF:', error)
	}
}
