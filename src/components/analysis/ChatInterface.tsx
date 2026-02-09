import { cn } from '../../lib/utils'
import { Download, Loader2, Send, Zap } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { MessageBubble } from './MessageBubble'

interface ChatInterfaceProps {
	mode: 'SYMBOLOGY' | 'FREQUENCY'
	setMode: (mode: 'SYMBOLOGY' | 'FREQUENCY') => void
	chatHistory: { role: 'user' | 'assistant'; content: string }[]
	loading: boolean
	inputMessage: string
	setInputMessage: (msg: string) => void
	handleAnalyze: () => void
	handleSendMessage: () => void
	downloadPDF: () => void
	image: File | null
	threadId: string | null
	t: any
}

export const ChatInterface = ({
	mode,
	setMode,
	chatHistory,
	loading,
	inputMessage,
	setInputMessage,
	handleAnalyze,
	handleSendMessage,
	downloadPDF,
	image,
	threadId,
	t
}: ChatInterfaceProps) => {
	const messagesEndRef = useRef<HTMLDivElement>(null)

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}

	useEffect(() => {
		scrollToBottom()
	}, [chatHistory, loading])

	return (
		<div className='w-full md:w-1/2 flex-1 md:h-full flex flex-col bg-background/95 backdrop-blur-xl border-l border-white/5 overflow-hidden'>
			{/* Mode Switcher */}
			<div className='flex border-b border-border/50 bg-black/20'>
				<button
					onClick={() => setMode('SYMBOLOGY')}
					className={cn(
						'flex-1 py-4 text-sm tracking-widest font-mono transition-all duration-300 relative overflow-hidden group',
						mode === 'SYMBOLOGY'
							? 'text-primary'
							: 'text-muted-foreground hover:text-foreground'
					)}>
					<span className='relative z-10'>{t.symbology}</span>
					{mode === 'SYMBOLOGY' && (
						<motion.div
							layoutId='activeTab'
							className='absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(224,238,34,0.5)]'
						/>
					)}
				</button>
				<button
					onClick={() => setMode('FREQUENCY')}
					className={cn(
						'flex-1 py-4 text-sm tracking-widest font-mono transition-all duration-300 relative overflow-hidden group',
						mode === 'FREQUENCY'
							? 'text-primary'
							: 'text-muted-foreground hover:text-foreground'
					)}>
					<span className='relative z-10'>{t.frequency}</span>
					{mode === 'FREQUENCY' && (
						<motion.div
							layoutId='activeTab'
							className='absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(224,238,34,0.5)]'
						/>
					)}
				</button>
			</div>

			{/* Chat Area */}
			<div className='flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent'>
				<AnimatePresence initial={false}>
					{chatHistory.length === 0 && !loading && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 0.5 }}
							exit={{ opacity: 0 }}
							className='h-full flex flex-col items-center justify-center text-muted-foreground space-y-4'>
							<Zap className='w-12 h-12 opacity-50' />
							<p className='font-mono text-sm text-center px-4'>{t.awaitingInput}</p>
						</motion.div>
					)}

					{chatHistory.map((msg, index) => (
						<MessageBubble key={index} role={msg.role} content={msg.content} />
					))}
				</AnimatePresence>

				{loading && (
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						className='space-y-3 p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-md max-w-[80%]'>
						<div className='h-2 bg-primary/20 rounded w-3/4 animate-pulse'></div>
						<div className='h-2 bg-primary/20 rounded w-1/2 animate-pulse'></div>
						<p className='text-primary font-mono text-[10px] pt-2 tracking-widest animate-pulse'>
							{t.accessingArchives}
						</p>
					</motion.div>
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Action Footer */}
			<div className='p-4 md:p-6 border-t border-white/10 bg-black/40 backdrop-blur-md'>
				{!threadId ? (
					<div className='flex gap-4'>
						<Button
							onClick={handleAnalyze}
							disabled={!image || loading}
							className='flex-1 py-6 font-bold tracking-wide shadow-[0_0_20px_rgba(224,238,34,0.1)] hover:shadow-[0_0_30px_rgba(224,238,34,0.3)] text-primary-foreground bg-primary hover:bg-primary/90 transition-all duration-300'>
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
							className='px-4 py-6 border-white/10 hover:border-primary/50 hover:bg-white/5'>
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
							className='flex-1 bg-white/5 border-white/10 focus:border-primary/50'
						/>
						<Button
							onClick={handleSendMessage}
							disabled={loading || !inputMessage.trim()}
							className='bg-primary text-primary-foreground hover:bg-primary/90'>
							<Send className='w-4 h-4' />
						</Button>
						<Button
							onClick={downloadPDF}
							variant='outline'
							className='px-4 border-white/10 hover:border-primary/50 hover:bg-white/5'>
							<Download className='w-5 h-5' />
						</Button>
					</div>
				)}
			</div>
		</div>
	)
}
