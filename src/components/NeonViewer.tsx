import { OrbitControls, shaderMaterial } from "@react-three/drei";
import { Canvas, extend, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useRef } from "react";
import * as THREE from "three";

const NeonMaterial = shaderMaterial(
	{ uTexture: new THREE.Texture(), uTime: 0, uColor: new THREE.Color(0.878, 0.933, 0.133) }, // #E0EE22
	// Vertex Shader
	`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
	// Fragment Shader
	`
    uniform sampler2D uTexture;
    uniform vec3 uColor;
    varying vec2 vUv;

    void main() {
      vec4 tex = texture2D(uTexture, vUv);
      
      // Texture is already processed: RGB is the signal strength
      float signal = tex.r; // Since we made it grayscale/white
      
      float alpha = smoothstep(0.1, 0.3, signal);

      vec3 neonColor = uColor;
      vec3 finalColor = neonColor * (signal * 2.0); // Boost intensity

      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
);

extend({ NeonMaterial });

const GlowingPlane = ({ texture }: { texture: THREE.Texture }) => {
	const meshRef = useRef<THREE.Mesh>(null);

	useFrame((state, delta) => {
		if (meshRef.current) {
			meshRef.current.rotation.y += delta * 0.5;
		}
	});

	return (
		<mesh ref={meshRef}>
			<planeGeometry args={[4, 4]} />
			{/* @ts-ignore */}
			<neonMaterial uTexture={texture} transparent={true} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
		</mesh>
	);
};

export const NeonViewer = ({ imageUrl }: { imageUrl: string | null }) => {
	const [processedTexture, setProcessedTexture] = useRefAndState<THREE.Texture | null>(null);

	// Custom hook or effect to process the image
	useEffect(() => {
		if (!imageUrl) return;

		const img = new Image();
		img.crossOrigin = "Anonymous";
		img.src = imageUrl;
		img.onload = () => {
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");
			if (!ctx) return;

			canvas.width = img.width;
			canvas.height = img.height;

			// Draw original image
			ctx.drawImage(img, 0, 0);

			// Get image data
			const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			const data = imageData.data;

			// 1. Calculate Histogram
			const histogram = new Array(256).fill(0);
			for (let i = 0; i < data.length; i += 4) {
				const r = data[i];
				const g = data[i + 1];
				const b = data[i + 2];
				const brightness = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
				histogram[brightness]++;
			}

			// 2. Find Dark Point (Ink) and White Point (Background) using percentiles
			const totalPixels = data.length / 4;
			let count = 0;
			let darkPoint = 0;
			let whitePoint = 255;

			// Find dark point (approx 5th percentile - darkest relevant pixels)
			for (let i = 0; i < 256; i++) {
				count += histogram[i];
				if (count > totalPixels * 0.05) {
					darkPoint = i;
					break;
				}
			}

			// Find white point (background peak, or approx 90th percentile)
			count = 0;
			for (let i = 255; i >= 0; i--) {
				count += histogram[i];
				if (count > totalPixels * 0.1) { // Top 10%
					whitePoint = i;
					break;
				}
			}

			// Safety checks to prevent division by zero or inversion
			if (whitePoint <= darkPoint) {
				whitePoint = 255;
				darkPoint = 0;
			}

			// Ensure we don't clip too hard
			whitePoint = Math.min(255, whitePoint + 10);
			darkPoint = Math.max(0, darkPoint - 10);

			for (let i = 0; i < data.length; i += 4) {
				const r = data[i];
				const g = data[i + 1];
				const b = data[i + 2];

				// Grayscale
				const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

				// Normalize brightness relative to our dynamic range
				// brightness < darkPoint -> 0.0
				// brightness > whitePoint -> 1.0
				let t = (brightness - darkPoint) / (whitePoint - darkPoint);
				t = Math.max(0, Math.min(1, t));

				// We want signal (ink) to be 1.0 (inverted)
				// So Ink (normalized 0.0) -> Signal 1.0
				// Paper (normalized 1.0) -> Signal 0.0
				let signal = 1.0 - t;

				// Apply Power Curve (Gamma) to clean up noise/background
				// Higher exponent = clearer background, sharper lines
				signal = Math.pow(signal, 3.0);

				const val = signal * 255;

				// Set output
				data[i] = val;
				data[i + 1] = val;
				data[i + 2] = val;
				// Use signal directly for alpha, but boost it slightly for visibility
				data[i + 3] = signal > 0.05 ? Math.min(255, val * 2.0) : 0;
			}

			ctx.putImageData(imageData, 0, 0);

			const texture = new THREE.CanvasTexture(canvas);
			setProcessedTexture(texture);
		};
	}, [imageUrl]);

	if (!imageUrl)
		return (
			<div className="w-full h-full flex items-center justify-center bg-background/50 text-primary border border-primary/20 rounded-lg backdrop-blur-sm">
				<div className="text-center">
					<p className="text-lg font-bold tracking-widest font-mono">WAITING FOR SIGNAL...</p>
					<p className="text-xs opacity-50 font-mono mt-2">UPLOAD SOURCE TO VISUALIZE</p>
				</div>
			</div>
		);

	return (
		<div className="w-full h-full bg-black/80 rounded-lg overflow-hidden border border-primary/20 shadow-[0_0_30px_rgba(224,238,34,0.1)] relative group">
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(224,238,34,0.05),transparent_70%)] pointer-events-none" />
			<Canvas camera={{ position: [0, 0, 6] }}>
				<color attach="background" args={["#000000"]} />
				<ambientLight intensity={0.5} />
				{processedTexture && <GlowingPlane texture={processedTexture} />}
				<EffectComposer>
					<Bloom luminanceThreshold={0.1} luminanceSmoothing={0.9} intensity={1.5} />
				</EffectComposer>
				<OrbitControls minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI * 0.75} />
			</Canvas>
		</div>
	);
};

// Helper for state + ref pattern if needed, or just use useState
import { useEffect, useState } from "react";

function useRefAndState<T>(initialValue: T): [T, (value: T) => void] {
	const [state, setState] = useState<T>(initialValue);
	return [state, setState];
}
