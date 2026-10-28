import { useEffect, useRef } from 'react';
import './FondoMolecular.css';

// Fondo animado: una red de enlaces muy finos, como la estructura de una
// molécula, sin dibujar los átomos (solo se ven las uniones). Debe ser sutil:
// líneas de 0.6px a baja opacidad sobre la aurora. El mouse funciona como un
// punto de presión suave: empuja levemente los nodos cercanos, sin luz.
//
// Es decorativo: no recibe clics (pointer-events: none), baja a ~30 fps,
// se pausa con la pestaña oculta y queda estático si el sistema pide
// reducir el movimiento.

const ENLACE_MAX = 125;        // distancia máxima para dibujar un enlace (px)
const ENLACE_DOBLE = 60;       // más cerca que esto, el enlace es doble
const PRESION_RADIO = 160;     // alcance del punto de presión del mouse (px)
const PRESION_FUERZA = 0.9;    // cuánto empuja (suave)
const AREA_POR_ATOMO = 9500;   // densidad: un átomo cada N px²
const MAX_ATOMOS = 180;
const FPS = 30;

// Colores de la marca (ver manual): cian dominante, algún violeta.
const CIAN = [0, 245, 255];
const VIOLETA = [191, 95, 255];

function crearAtomos(w, h) {
  const n = Math.min(MAX_ATOMOS, Math.round((w * h) / AREA_POR_ATOMO));
  return Array.from({ length: n }, () => {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      color: Math.random() < 0.15 ? VIOLETA : CIAN,
      // profundidad 0 (cerca) … 1 (lejos): los enlaces lejanos son más tenues
      z: Math.random(),
    };
  });
}

const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;

export default function FondoMolecular() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0, h = 0, atomos = [];
    const mouse = { x: -9999, y: -9999, activo: false, intensidad: 0 };

    const redimensionar = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      atomos = crearAtomos(w, h);
    };

    const dibujar = () => {
      ctx.clearRect(0, 0, w, h);

      // El punto de presión aparece y se desvanece con suavidad.
      mouse.intensidad += ((mouse.activo ? 1 : 0) - mouse.intensidad) * 0.08;

      for (const a of atomos) {
        if (!reducido) {
          const dx = a.x - mouse.x, dy = a.y - mouse.y;
          const d = Math.hypot(dx, dy);
          if (d < PRESION_RADIO && d > 0.1) {
            const f = (1 - d / PRESION_RADIO) * PRESION_FUERZA * mouse.intensidad;
            a.vx += (dx / d) * f * 0.05;
            a.vy += (dy / d) * f * 0.05;
          }
          a.vx *= 0.985; a.vy *= 0.985;               // rozamiento: vuelve a la deriva lenta
          a.vx += (Math.random() - 0.5) * 0.004;
          a.vy += (Math.random() - 0.5) * 0.004;
          a.x += a.vx; a.y += a.vy;
          if (a.x < -20) a.x = w + 20; else if (a.x > w + 20) a.x = -20;
          if (a.y < -20) a.y = h + 20; else if (a.y > h + 20) a.y = -20;
        }
      }

      // Enlaces
      for (let i = 0; i < atomos.length; i++) {
        const a = atomos[i];
        for (let j = i + 1; j < atomos.length; j++) {
          const b = atomos[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > ENLACE_MAX * ENLACE_MAX) continue;
          const d = Math.sqrt(d2);
          // Muy tenues; los enlaces entre nodos lejanos aún más.
          const alfa = (1 - d / ENLACE_MAX) * 0.11 * (1 - 0.6 * (a.z + b.z) / 2);

          ctx.strokeStyle = rgba(a.color === VIOLETA || b.color === VIOLETA ? VIOLETA : CIAN, alfa);
          ctx.lineWidth = 0.6;
          if (d < ENLACE_DOBLE) {
            // Enlace doble: dos líneas paralelas
            const nx = (-dy / d) * 1.2, ny = (dx / d) * 1.2;
            ctx.beginPath();
            ctx.moveTo(a.x + nx, a.y + ny); ctx.lineTo(b.x + nx, b.y + ny);
            ctx.moveTo(a.x - nx, a.y - ny); ctx.lineTo(b.x - nx, b.y - ny);
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

    };

    let raf = 0, ultimo = 0;
    const bucle = (t) => {
      raf = requestAnimationFrame(bucle);
      if (t - ultimo < 1000 / FPS) return;
      ultimo = t;
      dibujar();
    };

    const onMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.activo = true; };
    const onLeave = () => { mouse.activo = false; };
    const onVisibilidad = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reducido) raf = requestAnimationFrame(bucle);
    };

    redimensionar();
    if (reducido) dibujar();
    else raf = requestAnimationFrame(bucle);

    window.addEventListener('resize', redimensionar);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    document.addEventListener('visibilitychange', onVisibilidad);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', redimensionar);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      document.removeEventListener('visibilitychange', onVisibilidad);
    };
  }, []);

  return (
    <div className="fondo-molecular" aria-hidden="true">
      <div className="fondo-aurora" />
      <canvas ref={canvasRef} />
    </div>
  );
}
