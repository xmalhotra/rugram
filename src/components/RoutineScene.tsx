"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type Variant = "ambient" | "mark" | "routine";

export function RoutineScene({ variant, className }: { variant: Variant; className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = variant === "ambient" ? 6.5 : 4;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    element.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);
    const material = new THREE.MeshBasicMaterial({ color: variant === "mark" ? 0xc9ff3d : 0xa880ff, wireframe: variant !== "mark", transparent: true, opacity: variant === "ambient" ? 0.33 : 0.9 });
    const geometry = variant === "routine" ? new THREE.TorusKnotGeometry(0.72, 0.15, 96, 12) : new THREE.IcosahedronGeometry(variant === "ambient" ? 1.7 : 0.82, 2);
    const shape = new THREE.Mesh(geometry, material);
    group.add(shape);
    if (variant === "ambient") {
      const orbit = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.012, 6, 80), new THREE.MeshBasicMaterial({ color: 0xc9ff3d, transparent: true, opacity: 0.22 }));
      orbit.rotation.x = Math.PI / 2.4;
      group.add(orbit);
    }
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      renderer.setSize(width || 1, height || 1, false);
      camera.aspect = (width || 1) / (height || 1);
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    let frame = 0;
    const tick = () => {
      group.rotation.y += variant === "ambient" ? 0.002 : 0.009;
      group.rotation.x += 0.001;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); geometry.dispose(); material.dispose(); renderer.dispose(); renderer.domElement.remove(); };
  }, [variant]);

  return <div className={className} ref={host} aria-hidden="true" />;
}
