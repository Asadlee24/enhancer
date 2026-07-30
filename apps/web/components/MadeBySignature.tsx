'use client';

import { useEffect, useRef, useState } from 'react';

interface MadeBySignatureProps {
  /** Override canvas size. Defaults to 340×80 */
  width?: number;
  height?: number;
}

/**
 * MadeBySignature
 *
 * A self-contained Three.js "Made by Asad Lee" gold 3D-text signature.
 *
 * Behaviour:
 *  - Renders a WebGL canvas with extruded gold text (THREE.TextGeometry).
 *  - One entrance animation: fade-in + slight X-axis tilt that settles over ~1.2s.
 *  - Subtle mouse-parallax tilt on hover (±4° max), no idle spin.
 *  - Wraps to https://asad-lee-portfolio.vercel.app (new tab, noopener).
 *  - Respects prefers-reduced-motion: renders a static styled-text fallback,
 *    no canvas created at all.
 *  - Lazy-loads Three.js so it doesn't affect main bundle parse time.
 */
export default function MadeBySignature({ width = 340, height = 80 }: MadeBySignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Check prefers-reduced-motion on mount (client only)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (prefersReduced || !canvasRef.current) return;

    let rafId: number;
    let renderer: import('three').WebGLRenderer | null = null;
    let destroyed = false;

    async function init() {
      const THREE = await import('three');
      const { TextGeometry } = await import('three/examples/jsm/geometries/TextGeometry.js').catch(
        () => import('three/addons/geometries/TextGeometry.js' as any)
      );
      const { FontLoader } = await import('three/examples/jsm/loaders/FontLoader.js').catch(
        () => import('three/addons/loaders/FontLoader.js' as any)
      );

      if (destroyed || !canvasRef.current) return;

      const canvas = canvasRef.current;
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.z = 5;

      // ── Lighting ──────────────────────────────────────────────────────────
      const ambient = new THREE.AmbientLight(0xfff5e0, 1.8);
      scene.add(ambient);

      const pointLight = new THREE.PointLight(0xd4af37, 3, 20);
      pointLight.position.set(0, 2, 4);
      scene.add(pointLight);

      const rimLight = new THREE.DirectionalLight(0xffd700, 1.2);
      rimLight.position.set(-3, 1, 2);
      scene.add(rimLight);

      // ── Font & Text ───────────────────────────────────────────────────────
      const loader = new FontLoader();
      const font = await new Promise<import('three/examples/jsm/loaders/FontLoader.js').Font>(
        (resolve, reject) => {
          loader.load(
            'https://threejs.org/examples/fonts/helvetiker_bold.typeface.json',
            resolve,
            undefined,
            reject
          );
        }
      ).catch(() => null);

      if (!font || destroyed) return;

      // Full text as one mesh
      const textGeo = new TextGeometry('Made by Asad Lee', {
        font,
        size: 0.38,
        depth: 0.08,
        curveSegments: 8,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.006,
        bevelSegments: 3
      });
      textGeo.computeBoundingBox();

      const bbox = textGeo.boundingBox!;
      const textWidth = bbox.max.x - bbox.min.x;
      const textHeight = bbox.max.y - bbox.min.y;
      textGeo.translate(-textWidth / 2, -textHeight / 2, 0);

      const goldMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#C8922A'),
        metalness: 0.85,
        roughness: 0.2,
        emissive: new THREE.Color('#7a4d10'),
        emissiveIntensity: 0.25
      });

      const textMesh = new THREE.Mesh(textGeo, goldMat);
      scene.add(textMesh);

      // ── Entrance animation state ──────────────────────────────────────────
      const DURATION = 1200; // ms
      const startTime = performance.now();
      let opacity = 0;
      let entranceDone = false;

      // Mouse parallax
      let targetRotX = 0;
      let targetRotY = 0;
      let currentRotX = 0;
      let currentRotY = 0;
      const MAX_TILT = 0.07; // radians ~4°

      const wrapper = wrapperRef.current;
      if (wrapper) {
        wrapper.addEventListener('mousemove', (e: MouseEvent) => {
          const rect = wrapper.getBoundingClientRect();
          const nx = (e.clientX - rect.left) / rect.width - 0.5;
          const ny = (e.clientY - rect.top) / rect.height - 0.5;
          targetRotY = nx * MAX_TILT * 2;
          targetRotX = -ny * MAX_TILT;
        });
        wrapper.addEventListener('mouseleave', () => {
          targetRotX = 0;
          targetRotY = 0;
        });
      }

      // ── Render loop ───────────────────────────────────────────────────────
      setLoaded(true);

      function animate() {
        if (destroyed) return;
        rafId = requestAnimationFrame(animate);

        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / DURATION, 1);
        const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic

        if (!entranceDone) {
          opacity = eased;
          goldMat.opacity = opacity;
          goldMat.transparent = true;

          // Entrance tilt: start at -0.35 rad, settle to 0
          const entranceTilt = (1 - eased) * -0.35;
          textMesh.rotation.x = entranceTilt;
          textMesh.position.y = (1 - eased) * -0.25;

          if (t >= 1) {
            entranceDone = true;
            goldMat.transparent = false;
          }
        }

        if (entranceDone) {
          // Smooth parallax interpolation
          currentRotX += (targetRotX - currentRotX) * 0.08;
          currentRotY += (targetRotY - currentRotY) * 0.08;
          textMesh.rotation.x = currentRotX;
          textMesh.rotation.y = currentRotY;
        }

        renderer!.render(scene, camera);
      }

      animate();
    }

    void init();

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
      renderer?.dispose();
    };
  }, [prefersReduced, width, height]);

  // ── Reduced-motion fallback ───────────────────────────────────────────────
  if (prefersReduced) {
    return (
      <a
        href="https://asad-lee-portfolio.vercel.app"
        target="_blank"
        rel="noopener noreferrer"
        className="made-by-static"
        aria-label="Made by Asad Lee — visit portfolio"
      >
        Made by Asad Lee
      </a>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="made-by-wrapper"
      style={{ width, height }}
      title="Made by Asad Lee"
    >
      <a
        href="https://asad-lee-portfolio.vercel.app"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Made by Asad Lee — visit portfolio"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{ display: 'block' }}
        />
      </a>
    </div>
  );
}
