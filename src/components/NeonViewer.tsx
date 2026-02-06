import React, { useRef } from "react";
import { Canvas, useFrame, extend } from "@react-three/fiber";
import { shaderMaterial, OrbitControls, useTexture } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

const NeonMaterial = shaderMaterial(
	{ uTexture: new THREE.Texture(), uTime: 0, uColor: new THREE.Color(0.0, 1.0, 1.0) },
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

      // Neon color (Cyan/Magenta gradient)
      vec3 cyan = vec3(0.0, 1.0, 1.0);
      vec3 magenta = vec3(1.0, 0.0, 1.0);
      vec3 finalColor = mix(cyan, magenta, vUv.y);

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
			<div className="w-full h-full flex items-center justify-center bg-slate-950 text-cyan-400 border border-cyan-900/30 rounded-lg">
				<div className="text-center">
					<p className="text-lg font-bold">Waiting for Signal...</p>
					<p className="text-xs opacity-50">Upload an image to visualize</p>
				</div>
			</div>
		);

	return (
		<div className="w-full h-full bg-slate-950 rounded-lg overflow-hidden border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
			<Canvas camera={{ position: [0, 0, 6] }}>
				<color attach="background" args={["#020617"]} />
				<ambientLight />
				<GlowingPlane imageUrl={imageUrl} />
				<EffectComposer>
					<Bloom luminanceThreshold={0.1} luminanceSmoothing={0.9} intensity={2.0} />
				</EffectComposer>
				<OrbitControls />
			</Canvas>
		</div>
	);
};
