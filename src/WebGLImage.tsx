import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { fragmentShader, vertexShader } from './ShaderLogic';

type Props = {
  imageUrl: string;
  displacementUrl: string;
};

export function WebGLImage({ imageUrl, displacementUrl }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.z = 1.45;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const loader = new THREE.TextureLoader();

    const texture = loader.load(imageUrl, () => {
      renderer.render(scene, camera);
    });
    const disp = loader.load(displacementUrl, () => {
      renderer.render(scene, camera);
    });

    texture.minFilter = THREE.LinearFilter;
    disp.wrapS = THREE.RepeatWrapping;
    disp.wrapT = THREE.RepeatWrapping;

    const uniforms = {
      uTexture: { value: texture },
      uDisp: { value: disp },
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uHover: { value: 0 }
    };

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.58, 1.0, 64, 64),
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        transparent: true
      })
    );

    scene.add(mesh);

    const onEnter = () => {
      gsap.to(uniforms.uHover, { value: 1, duration: 0.35, ease: 'power2.out' });
    };

    const onLeave = () => {
      gsap.to(uniforms.uHover, { value: 0, duration: 0.45, ease: 'power2.out' });
    };

    mount.addEventListener('mouseenter', onEnter);
    mount.addEventListener('mouseleave', onLeave);

    const reveal = gsap.to(uniforms.uProgress, {
      value: 1,
      duration: 1.2,
      ease: 'expo.out'
    });

    const clock = new THREE.Clock();
    let frame = 0;

    const renderLoop = () => {
      uniforms.uTime.value += clock.getDelta();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frame);
      reveal.kill();
      mount.removeEventListener('mouseenter', onEnter);
      mount.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      mesh.geometry.dispose();
      (mesh.material as THREE.ShaderMaterial).dispose();
    };
  }, [imageUrl, displacementUrl]);

  return <div className="webgl-image" ref={mountRef} />;
}
