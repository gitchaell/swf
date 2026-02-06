// @ts-check
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import AstroPWA from "@vite-pwa/astro";

import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
	output: "server",

	adapter: vercel(),

	integrations: [
		react(),
		AstroPWA({
			registerType: "autoUpdate",
			includeAssets: ["favicon.ico", "logo.svg", "apple-touch-icon.png"],
			manifest: {
				name: "SIMBOLOGIAS Y FRECUENCIAS DE ONDA - DAKILA",
				short_name: "Simbologias Dakila",
				description: "Herramienta basada en información oficial de Dakila construida no oficialmente",
				theme_color: "#020617",
				icons: [
					{
						src: "pwa-192x192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
					},
				],
			},
		}),
	],

	vite: {
		plugins: [tailwindcss()],
	},
});
