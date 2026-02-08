import { Globe } from 'lucide-react'
import { Button } from './button'

type Language = 'ES' | 'PT' | 'EN'

interface HeaderProps {
	t: any
	language: Language
	setLanguage: React.Dispatch<React.SetStateAction<Language>>
}

export const Header = ({ t, language, setLanguage }: HeaderProps) => {
	return (
		<header className='fixed top-0 w-full z-20 glass p-4 border-b border-white/10 bg-background/50 backdrop-blur-md'>
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
	)
}
