import './EdificioIso.css';

// Icono 3D (isométrico) de un edificio: un bloque por piso apilado, con
// ventanas encendidas. La planta y la altura salen del nombre y de la
// cantidad de pisos, así cada edificio tiene su propia silueta y siempre la
// misma. Es vidrio cian de la marca: un edificio es una agrupación, no tiene
// color propio (ver manual de marca).

const H_PISO = 13;      // alto de cada piso (px del SVG)
const COS = 0.866, SIN = 0.5;

function hash(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619) >>> 0;
  return h;
}

// Proyección isométrica: (x, y, z) del edificio → punto del SVG
const p = (x, y, z) => [(x - y) * COS, (x + y) * SIN - z];
const pts = (...ps) => ps.map(q => q.join(',')).join(' ');

export default function EdificioIso({ nombre, pisos = 1, size = 150, activo = false }) {
  const h = hash(nombre);
  const W = 30 + (h % 3) * 8;            // ancho de la planta
  const D = 22 + ((h >> 3) % 3) * 7;     // fondo de la planta
  const n = Math.max(1, Math.min(pisos, 10));
  const ventanasX = 3 + ((h >> 6) % 2);  // ventanas por piso en la cara izquierda
  const ventanasY = 2 + ((h >> 8) % 2);  // y en la derecha
  const conAntena = (h >> 10) % 2 === 0;

  const altura = n * H_PISO + 6;
  const minX = -D * COS - 4, maxX = W * COS + 4;
  const minY = -altura - (conAntena ? 18 : 6), maxY = (W + D) * SIN + 4;

  const caras = [];
  for (let i = 0; i < n; i++) {
    const z0 = i * H_PISO, z1 = z0 + H_PISO - 2; // 2px de junta entre pisos
    caras.push(
      <g key={i} className="iso-piso" style={{ '--i': i }}>
        {/* cara izquierda (y = D) */}
        <polygon className="iso-cara-izq" points={pts(p(0, D, z0), p(W, D, z0), p(W, D, z1), p(0, D, z1))} />
        {/* cara derecha (x = W) */}
        <polygon className="iso-cara-der" points={pts(p(W, D, z0), p(W, 0, z0), p(W, 0, z1), p(W, D, z1))} />
        {Array.from({ length: ventanasX }, (_, k) => {
          const x0 = (W / ventanasX) * k + 2.5, x1 = x0 + W / ventanasX - 5;
          const encendida = ((h >> ((i * 3 + k) % 24)) & 1) === 1;
          return <polygon key={`l${k}`} className={`iso-ventana ${encendida ? 'on' : ''}`}
            points={pts(p(x0, D, z0 + 3), p(x1, D, z0 + 3), p(x1, D, z1 - 3), p(x0, D, z1 - 3))} />;
        })}
        {Array.from({ length: ventanasY }, (_, k) => {
          const y0 = (D / ventanasY) * k + 2.5, y1 = y0 + D / ventanasY - 5;
          const encendida = ((h >> ((i * 5 + k + 7) % 24)) & 1) === 1;
          return <polygon key={`r${k}`} className={`iso-ventana ${encendida ? 'on' : ''}`}
            points={pts(p(W, D - y0, z0 + 3), p(W, D - y1, z0 + 3), p(W, D - y1, z1 - 3), p(W, D - y0, z1 - 3))} />;
        })}
      </g>
    );
  }
  const zTecho = n * H_PISO - 2;
  const [ax, ay] = p(W * 0.6, D * 0.4, zTecho);

  return (
    <svg
      className={`edificio-iso ${activo ? 'edificio-iso-activo' : ''}`}
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      width={size}
      height={size}
      aria-hidden="true"
    >
      {/* sombra en el suelo */}
      <polygon className="iso-sombra" points={pts(p(-4, -4, 0), p(W + 6, -4, 0), p(W + 6, D + 6, 0), p(-4, D + 6, 0))} />
      {caras}
      <polygon className="iso-techo" style={{ '--pisos': n }} points={pts(p(0, 0, zTecho), p(W, 0, zTecho), p(W, D, zTecho), p(0, D, zTecho))} />
      {conAntena && <line className="iso-antena" x1={ax} y1={ay} x2={ax} y2={ay - 14} />}
    </svg>
  );
}
