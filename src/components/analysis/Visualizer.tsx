import { Upload } from 'lucide-react'
import { useRef } from 'react'
import { NeonViewer } from '../NeonViewer'
import { Button } from '../ui/button'

interface VisualizerProps {
	imageUrl: string | null
	mode: 'SYMBOLOGY' | 'FREQUENCY'
	setImage: (file: File) => void
	setImageUrl: (url: string) => void
	setMode: (mode: 'SYMBOLOGY' | 'FREQUENCY') => void
	setChatHistory: (history: any[]) => void
	setThreadId: (id: string | null) => void
	setResourceId: (id: string | null) => void
	t: any
}

export const Visualizer = ({
	imageUrl,
	mode,
	setImage,
	setImageUrl,
	setMode,
	setChatHistory,
	setThreadId,
	setResourceId,
	t
}: VisualizerProps) => {
	const fileInputRef = useRef<HTMLInputElement>(null)

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

	const loadExample = async (filename: string, newMode: 'SYMBOLOGY' | 'FREQUENCY') => {
		setImageUrl(`/examples/${filename}`)
		try {
			const res = await fetch(`/examples/${filename}`)
			const blob = await res.blob()
			const file = new File([blob], filename, { type: 'image/png' })
			setImage(file)
			setMode(newMode)
			setChatHistory([])
			setThreadId(null)
			setResourceId(null)
		} catch (err) {
			console.error("Failed to load example", err)
		}
	}

	return (
		<div className='relative w-full md:w-1/2 h-[35dvh] md:h-full shrink-0 bg-secondary/10 border-b md:border-b-0 md:border-r border-border overflow-hidden'>
			<div className='absolute top-4 left-4 z-10 flex gap-2 pointer-events-none'>
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
			<div className='absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 w-full px-4'>
				<Button
					onClick={() => fileInputRef.current?.click()}
					variant='secondary'
					className='rounded-full pl-6 pr-8 border border-white/10 hover:border-primary transition-all relative overflow-hidden group shadow-lg backdrop-blur-sm bg-black/50 text-white'>
					<span className='relative z-10 flex items-center gap-2'>
						<Upload className='w-4 h-4 group-hover:text-primary transition-colors' />
						{t.uploadSource}
					</span>
					<div className='absolute inset-0 bg-primary/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300' />
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
						onClick={() => loadExample('symbology.png', 'SYMBOLOGY')}
						className="text-[10px] text-muted-foreground hover:text-primary transition-colors border border-border/50 hover:border-primary/50 rounded-full px-3 py-1 bg-black/40 backdrop-blur-sm"
					>
						Try Symbology
					</button>
					<button
						onClick={() => loadExample('frequency.png', 'FREQUENCY')}
						className="text-[10px] text-muted-foreground hover:text-primary transition-colors border border-border/50 hover:border-primary/50  rounded-full px-3 py-1 bg-black/40 backdrop-blur-sm"
					>
						Try Frequency
					</button>
				</div>
			</div>
		</div>
	)
}
