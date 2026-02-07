import { OrbitControls, shaderMaterial, useTexture } from "@react-three/drei";
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
      float brightness = dot(tex.rgb, vec3(0.299, 0.587, 0.114));

      // Key out black background (assuming light strokes on dark bg)
      float alpha = smoothstep(0.05, 0.2, brightness);

      // Neon color (Lime gradient)
      vec3 lime = uColor;
      vec3 white = vec3(1.0, 1.0, 1.0);
      vec3 finalColor = mix(lime, white, brightness * 0.5);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
);

extend({ NeonMaterial });

const GlowingPlane = ({ imageUrl }: { imageUrl: string }) => {
	const meshRef = useRef<THREE.Mesh>(null);
	const texture = useTexture(imageUrl);

	useFrame((state, delta) => {
		if (meshRef.current) {
			meshRef.current.rotation.y += delta * 0.5;
		}
	});

	return (
		<mesh ref={meshRef}>
			<planeGeometry args={[4, 4]} />
			{/* @ts-ignore */}
			<neonMaterial uTexture={texture} transparent={true} side={THREE.DoubleSide} />
		</mesh>
	);
};

export const NeonViewer = ({ imageUrl }: { imageUrl: string | null }) => {
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
				<GlowingPlane imageUrl={imageUrl} />
				<EffectComposer>
					<Bloom luminanceThreshold={0.1} luminanceSmoothing={0.9} intensity={1.5} />
				</EffectComposer>
				<OrbitControls minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI * 0.75} />
			</Canvas>
		</div>
	);
};
