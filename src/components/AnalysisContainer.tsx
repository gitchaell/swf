import { Analytics } from '@vercel/analytics/react'
import React, { useEffect, useRef, useState } from 'react'
import { generatePDF } from '../lib/pdfUtils'
import { ChatInterface } from './analysis/ChatInterface'
import { PdfTemplate } from './analysis/PdfTemplate'
import { Visualizer } from './analysis/Visualizer'
import { Header } from './ui/Header'

type Language = 'ES' | 'PT' | 'EN'
type Mode = 'SYMBOLOGY' | 'FREQUENCY'

const translations = {
	EN: {
		title: 'Simbologías y Frecuencias de Onda - Dakila',
		description:
			'Tool based on official Dakila information built unofficially for symbology and frequency analysis.',
		headerTitle: 'SIMBOLOGIAS Y FRECUENCIAS DE ONDA - DAKILA',
		subtitle:
			'Herramienta basada en información oficial de Dakila construida no oficialmente',
		visualizer: 'VISUALIZER_V1.0',
		waveAnalysis: 'WAVE_ANALYSIS',
		uploadSource: 'UPLOAD_IMAGE',
		symbology: 'SYMBOLOGY',
		frequency: 'FREQUENCY',
		awaitingInput: 'AWAITING INPUT DATA...',
		accessingArchives: 'ACCESSING DAKILA ARCHIVES...',
		analysisComplete: 'ANALYSIS COMPLETE // CONFIDENCE: 98.4%',
		initiateAnalysis: 'INITIATE ANALYSIS',
		error: 'Error',
		errorAnalysis: 'An error occurred during analysis.',
		askFollowUp: 'Ask a follow-up question...'
	},
	ES: {
		title: 'Simbologías y Frecuencias de Onda - Dakila',
		description:
			'Herramienta basada en información oficial de Dakila construida no oficialmente para el análisis de simbologías y frecuencias.',
		headerTitle: 'SIMBOLOGÍAS Y FRECUENCIAS DE ONDA - DAKILA',
		subtitle:
			'Herramienta basada en información oficial de Dakila construida no oficialmente',
		visualizer: 'VISUALIZADOR_V1.0',
		waveAnalysis: 'ANÁLISIS_ONDA',
		uploadSource: 'SUBIR_IMAGEN',
		symbology: 'SIMBOLOGÍA',
		frequency: 'FRECUENCIA',
		awaitingInput: 'ESPERANDO DATOS DE ENTRADA...',
		accessingArchives: 'ACCEDIENDO A ARCHIVOS DAKILA...',
		analysisComplete: 'ANÁLISIS COMPLETADO // CONFIANZA: 98.4%',
		initiateAnalysis: 'INICIAR ANÁLISIS',
		error: 'Error',
		errorAnalysis: 'Ocurrió un error durante el análisis.',
		askFollowUp: 'Haz una pregunta de seguimiento...'
	},
	PT: {
		title: 'Simbologias e Frequências de Onda - Dakila',
		description:
			'Ferramenta baseada em informações oficiais da Dakila construída não oficialmente para análise de simbologias e frequências.',
		headerTitle: 'SIMBOLOGIAS E FREQUÊNCIAS DE ONDA - DAKILA',
		subtitle:
			'Ferramenta baseada em informações oficiais da Dakila construída não oficialmente',
		visualizer: 'VISUALIZADOR_V1.0',
		waveAnalysis: 'ANÁLISE_ONDA',
		uploadSource: 'CARREGAR_IMAGEM',
		symbology: 'SIMBOLOGIA',
		frequency: 'FREQUÊNCIA',
		awaitingInput: 'AGUARDANDO DADOS DE ENTRADA...',
		accessingArchives: 'ACESSANDO ARQUIVOS DAKILA...',
		analysisComplete: 'ANÁLISE COMPLETA // CONFIANÇA: 98.4%',
		initiateAnalysis: 'INICIAR ANÁLISIS',
		error: 'Erro',
		errorAnalysis: 'Ocorreu um erro durante a análise.',
		askFollowUp: 'Faça uma pergunta de acompanhamento...'
	}
}

export const AnalysisContainer = () => {
	const [language, setLanguage] = useState<Language>('EN')
	const [mode, setMode] = useState<Mode>('SYMBOLOGY')
	const [image, setImage] = useState<File | null>(null)
	const [imageUrl, setImageUrl] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)

	// Chat state
	const [threadId, setThreadId] = useState<string | null>(null)
	const [resourceId, setResourceId] = useState<string | null>(null)
	const [chatHistory, setChatHistory] = useState<
		{ role: 'user' | 'assistant'; content: string }[]
	>([])
	const [inputMessage, setInputMessage] = useState('')

	const t = translations[language]
	const pdfRef = useRef<HTMLDivElement>(null)

	// Effect to update SEO Title and Description
	useEffect(() => {
		document.title = t.title
		const metaDescription = document.querySelector('meta[name="description"]')
		if (metaDescription) {
			metaDescription.setAttribute('content', t.description)
		} else {
			const meta = document.createElement('meta')
			meta.name = 'description'
			meta.content = t.description
			document.head.appendChild(meta)
		}
	}, [language, t])

	const readStream = async (res: Response) => {
		const newThreadId = res.headers.get('X-Thread-Id')
		const newResourceId = res.headers.get('X-Resource-Id')
		if (newThreadId) setThreadId(newThreadId)
		if (newResourceId) setResourceId(newResourceId)

		if (!res.body) return

		const reader = res.body.getReader()
		const decoder = new TextDecoder()
		let done = false
		let accumulatedText = ''
		let buffer = ''

		setChatHistory(prev => [...prev, { role: 'assistant', content: '' }])

		while (!done) {
			const { value, done: doneReading } = await reader.read()
			done = doneReading
			const chunkValue = decoder.decode(value, { stream: !done })

			if (chunkValue) {
				buffer += chunkValue
				const lines = buffer.split('\n')
				buffer = lines.pop() || ''

				for (const line of lines) {
					const trimmedLine = line.trim()
					if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue

					if (trimmedLine === 'data: [DONE]') return

					try {
						const jsonStr = trimmedLine.substring(6)
						const data = JSON.parse(jsonStr)

						if (data.type === 'text-delta') {
							const newText = data.payload?.text || ''
							if (newText) {
								accumulatedText += newText
								setChatHistory(prev => {
									const newHistory = [...prev]
									const lastMsg = newHistory[newHistory.length - 1]
									if (lastMsg.role === 'assistant') {
										lastMsg.content = accumulatedText
									}
									return newHistory
								})
							}
						}
					} catch (e) {
						console.warn('Error parsing SSE data:', e, trimmedLine)
					}
				}
			}
		}
	}

	const handleAnalyze = async () => {
		if (!image) return
		setLoading(true)

		const formData = new FormData()
		formData.append('image', image)
		formData.append('language', language)
		formData.append('mode', mode)

		try {
			const res = await fetch('/api/analyze', {
				method: 'POST',
				body: formData
			})

			if (!res.ok) {
				const data = await res.json()
				setChatHistory(prev => [
					...prev,
					{ role: 'assistant', content: t.error + ': ' + (data.error || res.statusText) }
				])
			} else {
				setChatHistory([])
				await readStream(res)
			}
		} catch (error) {
			console.error(error)
			setChatHistory(prev => [
				...prev,
				{ role: 'assistant', content: t.errorAnalysis }
			])
		} finally {
			setLoading(false)
		}
	}

	const handleSendMessage = async () => {
		if (!inputMessage.trim() || loading) return
		const message = inputMessage
		setInputMessage('')
		setLoading(true)

		setChatHistory(prev => [...prev, { role: 'user', content: message }])

		const formData = new FormData()
		formData.append('message', message)
		formData.append('language', language)
		formData.append('mode', mode)
		if (threadId) formData.append('threadId', threadId)
		if (resourceId) formData.append('resourceId', resourceId)

		try {
			const res = await fetch('/api/analyze', {
				method: 'POST',
				body: formData
			})

			if (!res.ok) {
				const data = await res.json()
				setChatHistory(prev => [
					...prev,
					{ role: 'assistant', content: t.error + ': ' + (data.error || res.statusText) }
				])
			} else {
				await readStream(res)
			}
		} catch (error) {
			console.error(error)
			setChatHistory(prev => [
				...prev,
				{ role: 'assistant', content: t.errorAnalysis }
			])
		} finally {
			setLoading(false)
		}
	}

	const downloadPDF = async () => {
		if (pdfRef.current) {
			await generatePDF(pdfRef.current)
		}
	}

	return (
		<div className='min-h-screen bg-background text-foreground font-sans selection:bg-primary/30'>
			<Analytics />
			<Header t={t} language={language} setLanguage={setLanguage} />

			<main className='pt-20 h-[100dvh] flex flex-col md:flex-row overflow-hidden relative'>
				<Visualizer
					imageUrl={imageUrl}
					mode={mode}
					setImage={setImage}
					setImageUrl={setImageUrl}
					setMode={setMode}
					setChatHistory={setChatHistory}
					setThreadId={setThreadId}
					setResourceId={setResourceId}
					t={t}
				/>

				<ChatInterface
					mode={mode}
					setMode={setMode}
					chatHistory={chatHistory}
					loading={loading}
					inputMessage={inputMessage}
					setInputMessage={setInputMessage}
					handleAnalyze={handleAnalyze}
					handleSendMessage={handleSendMessage}
					downloadPDF={downloadPDF}
					image={image}
					threadId={threadId}
					t={t}
				/>
			</main>

			<PdfTemplate
				ref={pdfRef}
				imageUrl={imageUrl}
				chatHistory={chatHistory}
				t={t}
			/>
		</div>
	)
}
