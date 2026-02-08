import { cn } from '../../lib/utils'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'

interface MessageBubbleProps {
	role: 'user' | 'assistant'
	content: string
}

export const MessageBubble = ({ role, content }: MessageBubbleProps) => {
	const isUser = role === 'user'

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 10, scale: 0.95 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
			className={cn(
				'flex flex-col max-w-[90%]',
				isUser ? 'ml-auto items-end' : 'mr-auto items-start'
			)}>
			<div
				className={cn(
					'rounded-2xl p-4 text-sm prose prose-invert prose-sm max-w-none break-words shadow-lg',
					isUser
						? 'bg-primary/90 text-primary-foreground backdrop-blur-sm'
						: 'glass-panel border border-white/10 text-foreground bg-white/5 backdrop-blur-md'
				)}>
				{role === 'assistant' ? (
					<ReactMarkdown>{content}</ReactMarkdown>
				) : (
					content
				)}
			</div>
		</motion.div>
	)
}
