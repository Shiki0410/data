import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

gsap.registerPlugin(ScrollTrigger);

type ThreeRefs = {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  composer: EffectComposer | null;
  stars: THREE.Points[];
  nebula: THREE.Mesh | null;
  mountains: THREE.Mesh[];
  atmosphere: THREE.Mesh | null;
  animationId: number | null;
};

type HorizonHeroSectionProps = {
  onEnter?: () => void;
  onSkip?: () => void;
  className?: string;
};

export const Component = ({ onEnter, onSkip, className }: HorizonHeroSectionProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const subtitleRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const smoothCameraPos = useRef({ x: 0, y: 22, z: 115 });
  const refs = useRef<ThreeRefs>({ scene: null, camera: null, renderer: null, composer: null, stars: [], nebula: null, mountains: [], atmosphere: null, animationId: null });

  const titleChars = useMemo(() => 'YAMAMOTO × OHTANI / DATA CINEMA'.split(''), []);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x04050b, 0.00028);

    const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2400);
    camera.position.set(0, 18, 120);

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current ?? undefined, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.68;

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.9, 0.5, 0.88));

    refs.current.scene = scene;
    refs.current.camera = camera;
    refs.current.renderer = renderer;
    refs.current.composer = composer;

    const createStarField = () => {
      const starCount = 1200;
      for (let i = 0; i < 3; i += 1) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);
        for (let j = 0; j < starCount; j += 1) {
          const radius = 240 + Math.random() * 920;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(Math.random() * 2 - 1);
          positions[j * 3] = radius * Math.sin(phi) * Math.cos(theta);
          positions[j * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
          positions[j * 3 + 2] = radius * Math.cos(phi);
          const color = new THREE.Color().setHSL(Math.random() < 0.7 ? 0.58 : 0.95, 0.35, 0.82);
          colors[j * 3] = color.r;
          colors[j * 3 + 1] = color.g;
          colors[j * 3 + 2] = color.b;
          sizes[j] = Math.random() * 2.2 + 0.4;
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        const material = new THREE.ShaderMaterial({
          uniforms: { time: { value: 0 }, depth: { value: i } },
          vertexShader: `attribute float size; attribute vec3 color; varying vec3 vColor; uniform float time; uniform float depth; void main(){ vColor=color; vec3 pos=position; float angle=time*0.04*(1.0-depth*0.28); mat2 rot=mat2(cos(angle),-sin(angle),sin(angle),cos(angle)); pos.xy=rot*pos.xy; vec4 mvPosition=modelViewMatrix*vec4(pos,1.0); gl_PointSize=size*(320.0/-mvPosition.z); gl_Position=projectionMatrix*mvPosition; }`,
          fragmentShader: `varying vec3 vColor; void main(){ float dist=length(gl_PointCoord-vec2(0.5)); if(dist>0.5) discard; float opacity=1.0-smoothstep(0.0,0.5,dist); gl_FragColor=vec4(vColor,opacity); }`,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const stars = new THREE.Points(geometry, material);
        scene.add(stars);
        refs.current.stars.push(stars);
      }
    };

    const createNebula = () => {
      const geometry = new THREE.PlaneGeometry(9000, 4200, 100, 100);
      const material = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 }, color1: { value: new THREE.Color(0x173bff) }, color2: { value: new THREE.Color(0xff2c6d) }, opacity: { value: 0.28 } },
        vertexShader: `varying vec2 vUv; varying float vElevation; uniform float time; void main(){ vUv=uv; vec3 pos=position; float elevation=sin(pos.x*0.009+time)*cos(pos.y*0.01+time)*18.0; pos.z+=elevation; vElevation=elevation; gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.0); }`,
        fragmentShader: `uniform vec3 color1; uniform vec3 color2; uniform float opacity; uniform float time; varying vec2 vUv; varying float vElevation; void main(){ float mixFactor=sin(vUv.x*8.0+time*0.7)*cos(vUv.y*8.0+time*0.5); vec3 color=mix(color1,color2,mixFactor*0.5+0.5); float alpha=opacity*(1.0-length(vUv-0.5)*2.0); alpha*=1.0+vElevation*0.008; gl_FragColor=vec4(color,alpha); }`,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const nebula = new THREE.Mesh(geometry, material);
      nebula.position.z = -1100;
      scene.add(nebula);
      refs.current.nebula = nebula;
    };

    const createMountains = () => {
      const layers = [
        { distance: -55, height: 58, color: 0x111523, opacity: 0.96 },
        { distance: -105, height: 78, color: 0x16213a, opacity: 0.82 },
        { distance: -155, height: 100, color: 0x0b3556, opacity: 0.58 },
        { distance: -210, height: 124, color: 0x05284b, opacity: 0.4 }
      ];
      layers.forEach((layer, index) => {
        const points: THREE.Vector2[] = [];
        for (let i = 0; i <= 50; i += 1) {
          const x = (i / 50 - 0.5) * 1000;
          const y = Math.sin(i * 0.1) * layer.height + Math.sin(i * 0.05) * layer.height * 0.42 + Math.random() * layer.height * 0.16 - 92;
          points.push(new THREE.Vector2(x, y));
        }
        points.push(new THREE.Vector2(5000, -300));
        points.push(new THREE.Vector2(-5000, -300));
        const geometry = new THREE.ShapeGeometry(new THREE.Shape(points));
        const material = new THREE.MeshBasicMaterial({ color: layer.color, transparent: true, opacity: layer.opacity, side: THREE.DoubleSide });
        const mountain = new THREE.Mesh(geometry, material);
        mountain.position.z = layer.distance;
        mountain.position.y = layer.distance;
        mountain.userData = { baseZ: layer.distance, index };
        scene.add(mountain);
        refs.current.mountains.push(mountain);
      });
    };

    const createAtmosphere = () => {
      const geometry = new THREE.SphereGeometry(640, 32, 32);
      const material = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 } },
        vertexShader: `varying vec3 vNormal; void main(){ vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `varying vec3 vNormal; uniform float time; void main(){ float intensity = pow(0.68 - dot(vNormal, vec3(0.0,0.0,1.0)), 2.0); vec3 atmosphere = vec3(0.28, 0.58, 1.0) * intensity; float pulse = sin(time * 2.0) * 0.08 + 0.92; gl_FragColor = vec4(atmosphere * pulse, intensity * 0.24); }`,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true
      });
      const atmosphere = new THREE.Mesh(geometry, material);
      scene.add(atmosphere);
      refs.current.atmosphere = atmosphere;
    };

    createStarField();
    createNebula();
    createMountains();
    createAtmosphere();

    if (reduceMotion) {
      refs.current.stars.forEach((starField) => {
        const material = starField.material as THREE.ShaderMaterial;
        material.uniforms.time.value = 0;
      });
    }

    const animate = () => {
      const current = refs.current;
      current.animationId = requestAnimationFrame(animate);
      const time = Date.now() * 0.001;
      current.stars.forEach((starField) => {
        (starField.material as THREE.ShaderMaterial).uniforms.time.value = time;
      });
      if (current.nebula) (current.nebula.material as THREE.ShaderMaterial).uniforms.time.value = time * 0.5;
      if (current.camera) {
        smoothCameraPos.current.x += (0 - smoothCameraPos.current.x) * 0.02;
        smoothCameraPos.current.y += (24 - smoothCameraPos.current.y) * 0.02;
        smoothCameraPos.current.z += (118 - smoothCameraPos.current.z) * 0.02;
        current.camera.position.set(smoothCameraPos.current.x, smoothCameraPos.current.y + Math.sin(time * 0.22) * 1.2, smoothCameraPos.current.z);
        current.camera.lookAt(0, 8, -560);
      }
      current.mountains.forEach((mountain, i) => {
        const parallaxFactor = 1 + i * 0.5;
        mountain.position.x = Math.sin(time * 0.08) * 2.2 * parallaxFactor;
        mountain.position.y = 48 + Math.cos(time * 0.13) * parallaxFactor;
      });
      current.composer?.render();
    };
    animate();

    const handleResize = () => {
      const current = refs.current;
      if (!current.camera || !current.renderer || !current.composer) return;
      current.camera.aspect = window.innerWidth / window.innerHeight;
      current.camera.updateProjectionMatrix();
      current.renderer.setSize(window.innerWidth, window.innerHeight);
      current.composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      const current = refs.current;
      if (current.animationId) cancelAnimationFrame(current.animationId);
      current.stars.forEach((starField) => { starField.geometry.dispose(); (starField.material as THREE.Material).dispose(); });
      current.mountains.forEach((mountain) => { mountain.geometry.dispose(); (mountain.material as THREE.Material).dispose(); });
      current.nebula?.geometry.dispose();
      if (current.nebula) (current.nebula.material as THREE.Material).dispose();
      current.atmosphere?.geometry.dispose();
      if (current.atmosphere) (current.atmosphere.material as THREE.Material).dispose();
      current.renderer?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!menuRef.current || !titleRef.current || !subtitleRef.current) return;
    gsap.set([menuRef.current, titleRef.current, subtitleRef.current], { opacity: 1, visibility: 'visible' });
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from(menuRef.current, { x: -20, opacity: 0, duration: 0.8 })
      .from(titleRef.current.querySelectorAll('.title-char'), { y: 120, opacity: 0, duration: 1.0, stagger: 0.04 }, '-=0.35')
      .from(subtitleRef.current.querySelectorAll('.subtitle-line'), { y: 30, opacity: 0, duration: 0.8, stagger: 0.15 }, '-=0.65');
    return () => {
      tl.kill();
    };
  }, []);

  return (
    <section ref={containerRef} className={`hero-intro ${className ?? ''}`.trim()} aria-label="opening screen">
      <canvas ref={canvasRef} className="hero-intro-canvas" />
      <div className="hero-intro-vignette" aria-hidden="true" />
      <div ref={menuRef} className="hero-intro-topline">
        <span>CYBER ATHLETIC DATA SCAPE</span>
        <span>2026 / MLB STATCAST EDITION</span>
      </div>
      <div className="hero-intro-copy">
        <p className="hero-intro-kicker">STATCAST INTERACTIVE STORY</p>
        <h1 ref={titleRef} className="hero-intro-title title-art" aria-label="YAMAMOTO × OHTANI / DATA CINEMA">
          {titleChars.map((char, index) => (
            <span key={`${char}-${index}`} className="title-char">{char}</span>
          ))}
        </h1>
        <div ref={subtitleRef} className="hero-intro-subtitle">
          <p className="subtitle-line">Data Engine / Motion System / WebGL Distortion</p>
          <p className="subtitle-line">Use the opening to enter the full story world</p>
        </div>
        <div className="hero-intro-actions">
          <button type="button" className="hero-intro-button hero-intro-button-primary" onClick={onEnter}>PLAY OPENING</button>
          <button type="button" className="hero-intro-button hero-intro-button-secondary" onClick={onSkip}>SKIP</button>
        </div>
      </div>
    </section>
  );
};

const DemoOne = () => <Component />;

export { DemoOne };
export default Component;
