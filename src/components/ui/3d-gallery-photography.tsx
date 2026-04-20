import React, { useRef, useMemo, useCallback, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

type ImageItem = string | { src: string; alt?: string };

interface FadeSettings {
	fadeIn: {
		start: number;
		end: number;
	};
	fadeOut: {
		start: number;
		end: number;
	};
}

interface BlurSettings {
	blurIn: {
		start: number;
		end: number;
	};
	blurOut: {
		start: number;
		end: number;
	};
	maxBlur: number;
}

interface InfiniteGalleryProps {
	images: ImageItem[];
	speed?: number;
	zSpacing?: number;
	visibleCount?: number;
	falloff?: { near: number; far: number };
	fadeSettings?: FadeSettings;
	blurSettings?: BlurSettings;
	frameMode?: boolean;
	holdSeconds?: number;
	transitionSeconds?: number;
	className?: string;
	style?: React.CSSProperties;
}

interface PlaneData {
	index: number;
	z: number;
	imageIndex: number;
	x: number;
	y: number;
}

const DEFAULT_DEPTH_RANGE = 50;
const MAX_HORIZONTAL_OFFSET = 8;
const MAX_VERTICAL_OFFSET = 8;

const createClothMaterial = () =>
	new THREE.ShaderMaterial({
		transparent: true,
		uniforms: {
			map: { value: null },
			opacity: { value: 1.0 },
			blurAmount: { value: 0.0 },
			scrollForce: { value: 0.0 },
			time: { value: 0.0 },
			isHovered: { value: 0.0 },
		},
		vertexShader: `
      uniform float scrollForce;
      uniform float time;
      uniform float isHovered;
      varying vec2 vUv;
      varying vec3 vNormal;
      
      void main() {
        vUv = uv;
        vNormal = normal;
        vec3 pos = position;
        float curveIntensity = scrollForce * 0.3;
        float distanceFromCenter = length(pos.xy);
        float curve = distanceFromCenter * distanceFromCenter * curveIntensity;
        float ripple1 = sin(pos.x * 2.0 + scrollForce * 3.0) * 0.02;
        float ripple2 = sin(pos.y * 2.5 + scrollForce * 2.0) * 0.015;
        float clothEffect = (ripple1 + ripple2) * abs(curveIntensity) * 2.0;
        float flagWave = 0.0;
        if (isHovered > 0.5) {
          float wavePhase = pos.x * 3.0 + time * 8.0;
          float waveAmplitude = sin(wavePhase) * 0.1;
          float dampening = smoothstep(-0.5, 0.5, pos.x);
          flagWave = waveAmplitude * dampening;
          float secondaryWave = sin(pos.x * 5.0 + time * 12.0) * 0.03 * dampening;
          flagWave += secondaryWave;
        }
        pos.z -= (curve + clothEffect + flagWave);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
		fragmentShader: `
      uniform sampler2D map;
      uniform float opacity;
      uniform float blurAmount;
      uniform float scrollForce;
      varying vec2 vUv;
      varying vec3 vNormal;
      
      void main() {
        vec4 color = texture2D(map, vUv);
        float curveHighlight = abs(scrollForce) * 0.05;
        color.rgb += vec3(curveHighlight * 0.1);
        gl_FragColor = vec4(color.rgb, color.a * opacity);
      }
    `,
	});

function ImagePlane({
	texture,
	position,
	scale,
	material,
}: {
	texture: THREE.Texture;
	position: [number, number, number];
	scale: [number, number, number];
	material: THREE.ShaderMaterial;
}) {
	const [isHovered, setIsHovered] = useState(false);

	useEffect(() => {
		material.uniforms.map.value = texture;
	}, [material, texture]);

	useEffect(() => {
		material.uniforms.isHovered.value = isHovered ? 1.0 : 0.0;
	}, [material, isHovered]);

	return (
		<mesh position={position} scale={scale} material={material} onPointerEnter={() => setIsHovered(true)} onPointerLeave={() => setIsHovered(false)}>
			<planeGeometry args={[1, 1, 32, 32]} />
		</mesh>
	);
}

function GalleryScene({
	images,
	speed = 1,
	visibleCount = 8,
	frameMode = false,
	holdSeconds = 2.8,
	transitionSeconds = 1.2,
	fadeSettings = {
		fadeIn: { start: 0.05, end: 0.15 },
		fadeOut: { start: 0.85, end: 0.95 },
	},
	blurSettings = {
		blurIn: { start: 0.0, end: 0.1 },
		blurOut: { start: 0.9, end: 1.0 },
		maxBlur: 3.0,
	},
}: Omit<InfiniteGalleryProps, 'className' | 'style'>) {
	const [scrollVelocity, setScrollVelocity] = useState(0);
	const [autoPlay, setAutoPlay] = useState(true);
	const lastInteraction = useRef(Date.now());
	const frameModeRef = useRef(frameMode);
	const frameIndexRef = useRef(0);
	const frameTimerRef = useRef(0);
	const holdFrameSecondsRef = useRef(holdSeconds);
	const transitionFrameSecondsRef = useRef(transitionSeconds);

	const normalizedImages = useMemo(() => images.map((img) => (typeof img === 'string' ? { src: img, alt: '' } : img)), [images]);
	const textures = useTexture(normalizedImages.map((img) => img.src));
	const materials = useMemo(() => Array.from({ length: visibleCount }, () => createClothMaterial()), [visibleCount]);
	const displayCount = Math.min(visibleCount, normalizedImages.length);
	const spatialPositions = useMemo(() => {
		const positions: { x: number; y: number }[] = [];
		for (let i = 0; i < visibleCount; i++) {
			const horizontalAngle = (i * 2.618) % (Math.PI * 2);
			const verticalAngle = (i * 1.618 + Math.PI / 3) % (Math.PI * 2);
			const horizontalRadius = (i % 3) * 1.2;
			const verticalRadius = ((i + 1) % 4) * 0.8;
			positions.push({
				x: (Math.sin(horizontalAngle) * horizontalRadius * MAX_HORIZONTAL_OFFSET) / 3,
				y: (Math.cos(verticalAngle) * verticalRadius * MAX_VERTICAL_OFFSET) / 4,
			});
		}
		return positions;
	}, [visibleCount]);

	const planesData = useRef<PlaneData[]>(Array.from({ length: visibleCount }, (_, i) => ({ index: i, z: visibleCount > 0 ? ((DEFAULT_DEPTH_RANGE / visibleCount) * i) % DEFAULT_DEPTH_RANGE : 0, imageIndex: normalizedImages.length > 0 ? i % normalizedImages.length : 0, x: spatialPositions[i]?.x ?? 0, y: spatialPositions[i]?.y ?? 0 })));

	useEffect(() => {
		planesData.current = Array.from({ length: visibleCount }, (_, i) => ({ index: i, z: visibleCount > 0 ? ((DEFAULT_DEPTH_RANGE / Math.max(visibleCount, 1)) * i) % DEFAULT_DEPTH_RANGE : 0, imageIndex: normalizedImages.length > 0 ? i % normalizedImages.length : 0, x: spatialPositions[i]?.x ?? 0, y: spatialPositions[i]?.y ?? 0 }));
	}, [normalizedImages.length, spatialPositions, visibleCount]);

	const handleWheel = useCallback((event: WheelEvent) => {
		event.preventDefault();
		if (frameModeRef.current) return;
		setScrollVelocity((prev) => prev + event.deltaY * 0.01 * speed);
		setAutoPlay(false);
		lastInteraction.current = Date.now();
	}, [speed]);

	useEffect(() => {
		const canvas = document.querySelector('canvas');
		if (!canvas) return;
		canvas.addEventListener('wheel', handleWheel, { passive: false });
		return () => canvas.removeEventListener('wheel', handleWheel);
	}, [handleWheel]);

	useEffect(() => {
		frameModeRef.current = frameMode;
		holdFrameSecondsRef.current = holdSeconds;
		transitionFrameSecondsRef.current = transitionSeconds;
	}, [frameMode, holdSeconds, transitionSeconds]);

	useEffect(() => {
		if (!frameMode) {
			const interval = setInterval(() => {
				if (Date.now() - lastInteraction.current > 3000) setAutoPlay(true);
			}, 1000);
			return () => clearInterval(interval);
		}

		const interval = window.setInterval(() => {
			frameTimerRef.current += 0.016;
			const phase = holdFrameSecondsRef.current + transitionFrameSecondsRef.current;
			if (normalizedImages.length <= 1) return;
			if (frameTimerRef.current >= phase) {
				frameTimerRef.current = 0;
				frameIndexRef.current = (frameIndexRef.current + 1) % normalizedImages.length;
			}
			setScrollVelocity((prev) => {
				const target = phase > 0 && frameTimerRef.current <= holdFrameSecondsRef.current ? 0.04 : 0.18;
				return prev * 0.82 + target;
			});
		}, 33);

		return () => window.clearInterval(interval);
	}, [frameMode, normalizedImages.length]);

	useFrame((state, delta) => {
		if (autoPlay) setScrollVelocity((prev) => prev + 0.3 * delta);
		setScrollVelocity((prev) => prev * 0.95);
		const time = state.clock.getElapsedTime();
		materials.forEach((material) => {
			material.uniforms.time.value = time;
			material.uniforms.scrollForce.value = scrollVelocity;
		});

		planesData.current.forEach((plane, i) => {
			let newZ = plane.z + scrollVelocity * delta * 10;
			if (newZ >= DEFAULT_DEPTH_RANGE) newZ -= DEFAULT_DEPTH_RANGE * Math.floor(newZ / DEFAULT_DEPTH_RANGE);
			else if (newZ < 0) newZ += DEFAULT_DEPTH_RANGE * Math.ceil(-newZ / DEFAULT_DEPTH_RANGE);
			plane.z = ((newZ % DEFAULT_DEPTH_RANGE) + DEFAULT_DEPTH_RANGE) % DEFAULT_DEPTH_RANGE;
			plane.x = spatialPositions[i]?.x ?? 0;
			plane.y = spatialPositions[i]?.y ?? 0;
			const normalizedPosition = plane.z / DEFAULT_DEPTH_RANGE;
			let opacity = 1;
			if (normalizedPosition < fadeSettings.fadeIn.start || normalizedPosition > fadeSettings.fadeOut.end) opacity = 0;
			else if (normalizedPosition <= fadeSettings.fadeIn.end) opacity = (normalizedPosition - fadeSettings.fadeIn.start) / (fadeSettings.fadeIn.end - fadeSettings.fadeIn.start);
			else if (normalizedPosition >= fadeSettings.fadeOut.start) opacity = 1 - (normalizedPosition - fadeSettings.fadeOut.start) / (fadeSettings.fadeOut.end - fadeSettings.fadeOut.start);
			let blur = 0;
			if (normalizedPosition < blurSettings.blurIn.start || normalizedPosition > blurSettings.blurOut.end) blur = blurSettings.maxBlur;
			else if (normalizedPosition <= blurSettings.blurIn.end) blur = blurSettings.maxBlur * (1 - (normalizedPosition - blurSettings.blurIn.start) / (blurSettings.blurIn.end - blurSettings.blurIn.start));
			else if (normalizedPosition >= blurSettings.blurOut.start) blur = blurSettings.maxBlur * ((normalizedPosition - blurSettings.blurOut.start) / (blurSettings.blurOut.end - blurSettings.blurOut.start));
			const material = materials[i];
			material.uniforms.opacity.value = Math.max(0, Math.min(1, opacity));
			material.uniforms.blurAmount.value = Math.max(0, Math.min(blurSettings.maxBlur, blur));
		});
	});

	if (!normalizedImages.length) return null;

	return <>{planesData.current.map((plane, i) => {
		const texture = textures[plane.imageIndex];
		const material = materials[i];
		if (!texture || !material) return null;
		const aspect = texture.image ? texture.image.width / texture.image.height : 1;
		const scale: [number, number, number] = aspect > 1 ? [2 * aspect, 2, 1] : [2, 2 / aspect, 1];
		return <ImagePlane key={plane.index} texture={texture} position={[plane.x, plane.y, plane.z - DEFAULT_DEPTH_RANGE / 2]} scale={scale} material={material} />;
	})}</>;
}

function FallbackGallery({ images }: { images: ImageItem[] }) {
	const normalizedImages = useMemo(() => images.map((img) => (typeof img === 'string' ? { src: img, alt: '' } : img)), [images]);
	return (
		<div className="flex h-full flex-col items-center justify-center bg-gray-100 p-4">
			<p className="mb-4 text-gray-600">WebGL not supported. Showing image list:</p>
			<div className="grid max-h-96 grid-cols-2 gap-4 overflow-y-auto md:grid-cols-3">
				{normalizedImages.map((img, i) => (
					<img key={i} src={img.src || '/placeholder.svg'} alt={img.alt} className="h-32 w-full rounded object-cover" />
				))}
			</div>
		</div>
	);
}

function FrameGalleryScene({ images, holdSeconds = 2.8, transitionSeconds = 1.2 }: { images: ImageItem[]; holdSeconds?: number; transitionSeconds?: number }) {
	const normalizedImages = useMemo(() => images.map((img) => (typeof img === 'string' ? { src: img, alt: '' } : img)), [images]);
	const [index, setIndex] = useState(0);
	const [nextIndex, setNextIndex] = useState(1);
	const [progress, setProgress] = useState(0);
	useEffect(() => {
		if (normalizedImages.length <= 1) return;
		const step = 33;
		let t = 0;
		const phase = (holdSeconds + transitionSeconds) * 1000;
		const id = window.setInterval(() => {
			t += step;
			const local = t % phase;
			if (local < holdSeconds * 1000) {
				setProgress(0);
				setNextIndex((index + 1) % normalizedImages.length);
				return;
			}
			const p = Math.min(1, (local - holdSeconds * 1000) / (transitionSeconds * 1000));
			setProgress(p);
			if (p >= 1) {
				setIndex((prev) => (prev + 1) % normalizedImages.length);
				setNextIndex((prev) => (prev + 1) % normalizedImages.length);
			}
		}, step);
		return () => window.clearInterval(id);
	}, [holdSeconds, transitionSeconds, index, normalizedImages.length]);

	if (!normalizedImages.length) return null;
	const current = normalizedImages[index % normalizedImages.length];
	const upcoming = normalizedImages[nextIndex % normalizedImages.length] ?? current;
	return (
		<div className="frame-gallery-scene">
			<div className="frame-gallery-card frame-gallery-current" style={{ opacity: 1 - progress, transform: `scale(${1 - progress * 0.03}) translateY(${progress * 8}px)` }}>
				<img src={current.src} alt={current.alt} />
			</div>
			<div className="frame-gallery-card frame-gallery-next" style={{ opacity: progress, transform: `scale(${0.985 + progress * 0.015}) translateY(${(1 - progress) * 10}px)` }}>
				<img src={upcoming.src} alt={upcoming.alt} />
			</div>
			<div className="frame-gallery-film" aria-hidden="true">
				{normalizedImages.map((img, i) => <span key={`${img.src}-${i}`} className={i === index ? 'active' : ''} />)}
			</div>
		</div>
	);
}

export default function InfiniteGallery({
	images,
	className = 'h-96 w-full',
	style,
	fadeSettings = {
		fadeIn: { start: 0.05, end: 0.25 },
		fadeOut: { start: 0.4, end: 0.43 },
	},
	blurSettings = {
		blurIn: { start: 0.0, end: 0.1 },
		blurOut: { start: 0.4, end: 0.43 },
		maxBlur: 8.0,
	},
	frameMode = false,
	holdSeconds = 3.4,
	transitionSeconds = 1.8,
}: InfiniteGalleryProps) {
	const [webglSupported, setWebglSupported] = useState(true);
	const normalizedImages = useMemo(() => images.map((img) => (typeof img === 'string' ? { src: img, alt: '' } : img)), [images]);

	useEffect(() => {
		try {
			const canvas = document.createElement('canvas');
			const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
			if (!gl) setWebglSupported(false);
		} catch {
			setWebglSupported(false);
		}
	}, []);

	if (!webglSupported) {
		return <div className={className} style={style}><FallbackGallery images={images} /></div>;
	}

	return (
		<div className={className} style={style}>
			<Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-slate-300">Loading transition gallery…</div>}>
				{frameMode ? (
					<FrameGalleryScene images={normalizedImages} holdSeconds={holdSeconds} transitionSeconds={transitionSeconds} />
				) : (
					<Canvas camera={{ position: [0, 0, 0], fov: 55 }} gl={{ antialias: true, alpha: true }}>
						<GalleryScene images={normalizedImages} fadeSettings={fadeSettings} blurSettings={blurSettings} frameMode={frameMode} holdSeconds={holdSeconds} transitionSeconds={transitionSeconds} />
					</Canvas>
				)}
			</Suspense>
		</div>
	);
}
