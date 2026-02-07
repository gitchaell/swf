// @ts-check
import vercel from '@astrojs/vercel'
import AstroPWA from '@vite-pwa/astro'
import { defineConfig } from 'astro/config'

import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'

// https://astro.build/config
export default defineConfig({
	output: 'server',

	adapter: vercel(),

	integrations: [
		react(),
		AstroPWA({
			registerType: 'autoUpdate',
			includeAssets: ['favicon.ico', 'logo.svg'],
			manifest: {
				name: 'Simbologías y Frecuencias de Onda - Dakila',
				short_name: 'Simbologías Dakila',
				description:
					'Herramienta basada en información oficial de Dakila construida no oficialmente',
				theme_color: '#020617',
				icons: [
					{
						src: 'pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png'
					}
				]
			}
		})
	],

	vite: {
		plugins: [tailwindcss()]
	}
})
