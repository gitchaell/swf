import { Analytics } from '@vercel/analytics/react'
import {
	Activity,
	Download,
	Globe,
	Loader2,
	Send,
	Upload,
	Zap
} from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { cn } from '../lib/utils'
import { NeonViewer } from './NeonViewer'
import { Button } from './ui/button'
import { Input } from './ui/input'

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
		initiateAnalysis: 'INICIAR ANÁLISE',
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
	const fileInputRef = useRef<HTMLInputElement>(null)

	// Chat state
	const [threadId, setThreadId] = useState<string | null>(null)
	const [resourceId, setResourceId] = useState<string | null>(null)
	const [chatHistory, setChatHistory] = useState<
		{ role: 'user' | 'assistant'; content: string }[]
	>([])
	const [inputMessage, setInputMessage] = useState('')

	const t = translations[language]

	// Effect to update SEO Title and Description
	useEffect(() => {
		document.title = t.title

		// Update meta description
		const metaDescription = document.querySelector('meta[name="description"]')
		if (metaDescription) {
			metaDescription.setAttribute('content', t.description)
		} else {
			// Create if it doesn't exist (though it should from index.astro)
			const meta = document.createElement('meta')
			meta.name = 'description'
			meta.content = t.description
			document.head.appendChild(meta)
		}
	}, [language, t])

	const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const file = e.target.files[0]
			setImage(file)
			setImageUrl(URL.createObjectURL(file))
			setChatHistory([])
			setThreadId(null)
			setResourceId(null)
		}
	}

	const readStream = async (res: Response) => {
		// Read headers
		const newThreadId = res.headers.get('X-Thread-Id')
		const newResourceId = res.headers.get('X-Resource-Id')
		if (newThreadId) setThreadId(newThreadId)
		if (newResourceId) setResourceId(newResourceId)

		if (!res.body) return

		const reader = res.body.getReader()
		const decoder = new TextDecoder()
		let done = false
		let accumulatedText = ''
		let buffer = '' // Buffer for handling split chunks

		// Add initial empty message for assistant
		setChatHistory(prev => [...prev, { role: 'assistant', content: '' }])

		while (!done) {
			const { value, done: doneReading } = await reader.read()
			done = doneReading
			const chunkValue = decoder.decode(value, { stream: !done })

			if (chunkValue) {
				buffer += chunkValue
				const lines = buffer.split('\n')

				// Keep the last incomplete line in the buffer
				buffer = lines.pop() || ''

				for (const line of lines) {
					const trimmedLine = line.trim()
					if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue

					try {
						const jsonStr = trimmedLine.substring(6) // Remove "data: " prefix
						const data = JSON.parse(jsonStr)

						// Handle specific event types from Mastra
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
				const data = await res.json() // Or text if json fails
				setChatHistory(prev => [
					...prev,
					{ role: 'assistant', content: t.error + ': ' + (data.error || res.statusText) }
				])
			} else {
				setChatHistory([]) // Clear previous history on new analysis
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

	const downloadPDF = () => {
		window.print()
	}

	return (
		<div className='min-h-screen bg-background text-foreground font-sans selection:bg-primary/30'>
			<Analytics />
			{/* Header */}
			<header className='fixed top-0 w-full z-10 glass p-4'>
				<div className='max-w-7xl mx-auto flex justify-between items-center'>
					<div className='flex items-center gap-2'>
						<img src='/logo.svg' alt='App Logo' className='w-8 h-8' />
						<div className='flex flex-col'>
							<h1 className='text-lg font-bold tracking-tight bg-linear-to-r from-primary to-white bg-clip-text text-transparent leading-tight'>
								{t.headerTitle}
							</h1>
							<p className='text-[10px] text-muted-foreground font-mono tracking-wide'>
								{t.subtitle}
							</p>
						</div>
					</div>
					<div className='flex items-center gap-4'>
						<Button
							variant='outline'
							size='sm'
							onClick={() =>
								setLanguage(l => (l === 'EN' ? 'ES' : l === 'ES' ? 'PT' : 'EN'))
							}
							className='flex items-center gap-2 font-mono text-xs border-border hover:border-primary/50'>
							<Globe className='w-3 h-3' />
							{language}
						</Button>
					</div>
				</div>
			</header>

			{/* Main Layout */}
			<main className='pt-20 h-screen flex flex-col md:flex-row overflow-hidden'>
				{/* Left: 3D Viewer */}
				<div className='relative w-full md:w-1/2 h-[40vh] md:h-full bg-secondary/10 border-b md:border-b-0 md:border-r border-border'>
					<div className='absolute top-4 left-4 z-10 flex gap-2'>
						<div className='px-2 py-1 bg-background/50 backdrop-blur rounded text-xs font-mono text-primary border border-primary/50'>
							{t.visualizer}
						</div>
						{mode === 'FREQUENCY' && (
							<div className='px-2 py-1 bg-primary/10 backdrop-blur rounded text-xs font-mono text-primary border border-primary/50 animate-pulse'>
								{t.waveAnalysis}
							</div>
						)}
					</div>

					<NeonViewer imageUrl={imageUrl} />

					{/* Controls overlay */}
					<div className='absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 w-full'>
						<Button
							onClick={() => fileInputRef.current?.click()}
							variant='secondary'
							className='rounded-full pl-6 pr-8 border border-white/10 hover:border-primary transition-all relative overflow-hidden group'>
							<span className='relative z-10 flex items-center gap-2'>
								<Upload className='w-4 h-4 group-hover:text-primary transition-colors' />
								{t.uploadSource}
							</span>
							<div className='absolute inset-0 bg-primary/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300' />
						</Button>
						<input
							type='file'
							ref={fileInputRef}
							className='hidden'
							onChange={handleUpload}
							accept='image/*'
						/>

						{/* Examples */}
						<div className="flex gap-2">
							<button
								onClick={() => {
									setImageUrl('/examples/symbology.png');
									// Fetch the file to set as 'image' state for upload
									fetch('/examples/symbology.png')
										.then(res => res.blob())
										.then(blob => {
											const file = new File([blob], "symbology.png", { type: "image/png" });
											setImage(file);
											setMode('SYMBOLOGY');
										});
									setChatHistory([]);
									setThreadId(null);
									setResourceId(null);
								}}
								className="text-[10px] text-muted-foreground hover:text-primary transition-colors border border-border/50 hover:border-primary/50 rounded-full px-3 py-1 bg-black/40 backdrop-blur-sm"
							>
								Try Symbology
							</button>
							<button
								onClick={() => {
									setImageUrl('/examples/frequency.png');
									fetch('/examples/frequency.png')
										.then(res => res.blob())
										.then(blob => {
											const file = new File([blob], "frequency.png", { type: "image/png" });
											setImage(file);
											setMode('FREQUENCY');
										});
									setChatHistory([]);
									setThreadId(null);
									setResourceId(null);
								}}
								className="text-[10px] text-muted-foreground hover:text-primary transition-colors border border-border/50 hover:border-primary/50  rounded-full px-3 py-1 bg-black/40 backdrop-blur-sm"
							>
								Try Frequency
							</button>
						</div>
					</div>
				</div>

				{/* Right: Analysis & Chat */}
				<div className='w-full md:w-1/2 h-[60vh] md:h-full flex flex-col bg-background'>
					{/* Mode Switcher */}
					<div className='flex border-b border-border'>
						<button
							onClick={() => setMode('SYMBOLOGY')}
							className={cn(
								'flex-1 py-4 text-sm tracking-widest font-mono transition-colors hover:bg-secondary/20',
								mode === 'SYMBOLOGY'
									? 'text-primary border-b-2 border-primary'
									: 'text-muted-foreground'
							)}>
							{t.symbology}
						</button>
						<button
							onClick={() => setMode('FREQUENCY')}
							className={cn(
								'flex-1 py-4 text-sm tracking-widest font-mono transition-colors hover:bg-secondary/20',
								mode === 'FREQUENCY'
									? 'text-primary border-b-2 border-primary'
									: 'text-muted-foreground'
							)}>
							{t.frequency}
						</button>
					</div>

					{/* Chat Area */}
					<div className='flex-1 overflow-y-auto p-6 space-y-4'>
						{chatHistory.length === 0 && !loading && (
							<div className='h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 opacity-50'>
								<Zap className='w-12 h-12' />
								<p className='font-mono text-sm'>{t.awaitingInput}</p>
							</div>
						)}

						{chatHistory.map((msg, index) => (
							<div
								key={index}
								className={cn(
									'flex flex-col max-w-[90%]',
									msg.role === 'user'
										? 'ml-auto items-end'
										: 'mr-auto items-start'
								)}>
								<div
									className={cn(
										'rounded-lg p-4 text-sm',
										msg.role === 'user'
											? 'bg-primary text-primary-foreground'
											: 'bg-muted text-foreground border border-border'
									)}>
									{msg.role === 'assistant' ? (
										<ReactMarkdown className='prose prose-invert prose-sm max-w-none break-words'>
											{msg.content}
										</ReactMarkdown>
									) : (
										msg.content
									)}
								</div>
							</div>
						))}

						{loading && (
							<div className='space-y-4 animate-pulse'>
								<div className='h-4 bg-secondary rounded w-3/4'></div>
								<div className='h-4 bg-secondary rounded w-1/2'></div>
								<div className='h-4 bg-secondary rounded w-5/6'></div>
								<p className='text-primary font-mono text-xs pt-4'>
									{t.accessingArchives}
								</p>
							</div>
						)}
					</div>

					{/* Action Footer */}
					<div className='p-6 border-t border-border bg-background/50'>
						{!threadId ? (
							<div className='flex gap-4'>
								<Button
									onClick={handleAnalyze}
									disabled={!image || loading}
									className='flex-1 py-6 font-bold tracking-wide shadow-[0_0_20px_rgba(224,238,34,0.2)] hover:shadow-[0_0_30px_rgba(224,238,34,0.4)] text-primary-foreground bg-primary hover:bg-primary/90'>
									{loading ? (
										<Loader2 className='w-4 h-4 animate-spin mr-2' />
									) : (
										<Zap className='w-4 h-4 mr-2' />
									)}
									{t.initiateAnalysis}
								</Button>

								<Button
									onClick={downloadPDF}
									disabled={chatHistory.length === 0}
									variant='outline'
									className='px-4 py-6'>
									<Download className='w-5 h-5' />
								</Button>
							</div>
						) : (
							<div className='flex gap-2 w-full'>
								<Input
									value={inputMessage}
									onChange={e => setInputMessage(e.target.value)}
									placeholder={t.askFollowUp}
									onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
									className='flex-1'
								/>
								<Button
									onClick={handleSendMessage}
									disabled={loading || !inputMessage.trim()}>
									<Send className='w-4 h-4' />
								</Button>
								<Button
									onClick={downloadPDF}
									variant='outline'
									className='px-4'>
									<Download className='w-5 h-5' />
								</Button>
							</div>
						)}
					</div>
				</div>
			</main>
		</div>
	)
}
