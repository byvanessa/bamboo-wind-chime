import { useMemo } from 'react';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// vidro reciclado/artesanal: lilás, azul, verde
const TINTS = [
  '272, 48%, 68%',
  '210, 62%, 64%',
  '152, 46%, 58%',
];

/**
 * Caquinho de vidro — pequeno polígono facetado irregular (gerado uma vez
 * por peça), translúcido e brilhante: gradiente diagonal, aresta clara em
 * screen, faísca especular e halo suave. Os caquinhos formam correntes
 * interligadas (a física encadeia os corpos; o fio passa por dentro).
 */
export function GlassShardVisual({ w, h, index }) {
  const { clip, tint, sparkle } = useMemo(() => {
    const rnd = mulberry32(7777 + index * 149);
    const t = TINTS[Math.floor(rnd() * TINTS.length)];

    // 5-6 vértices com jitter — cada caquinho é único (uns compridos,
    // uns atarracados, uns tortos)
    const jx = () => 4 + rnd() * 22;
    const jy = () => 3 + rnd() * 12;
    const six = rnd() > 0.45;
    const pts = [
      [26 + rnd() * 48, jy() * 0.5],
      [100 - jx() * 0.4, 18 + rnd() * 26],
      [100 - jx(), 100 - jy()],
      ...(six ? [[40 + rnd() * 34, 100 - jy() * 0.3]] : []),
      [jx(), 100 - jy() * 0.7],
      [jx() * 0.4, 22 + rnd() * 28],
    ];
    const poly = pts.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(', ');
    return {
      clip: `polygon(${poly})`,
      tint: t,
      sparkle: { x: 22 + rnd() * 40, y: 14 + rnd() * 30, s: 0.7 + rnd() * 0.5 },
    };
  }, [index]);

  // caco visual um pouco maior que o corpo físico, centrado, com
  // inclinação e escala próprias — vidro quebrado não é uniforme
  const { tilt, grow } = useMemo(() => {
    const rnd = mulberry32(919 + index * 53);
    return { tilt: (rnd() - 0.5) * 24, grow: 0.88 + rnd() * 0.42 };
  }, [index]);
  const vw = w * 1.5 * grow;
  const vh = h * 1.12 * grow;

  return (
    <div
      className="glass-shard"
      style={{
        width: vw,
        height: vh,
        left: -(vw - w) / 2,
        top: -(vh - h) / 2,
        transform: `rotate(${tilt}deg)`,
      }}
    >
      <div
        className="glass-body"
        style={{
          clipPath: clip,
          background: `linear-gradient(132deg,
            hsla(0, 0%, 100%, 0.72) 0%,
            hsla(${tint}, 0.5) 30%,
            hsla(${tint}, 0.28) 55%,
            hsla(0, 0%, 100%, 0.6) 82%,
            hsla(${tint}, 0.42) 100%)`,
        }}
      />
      <div
        className="glass-edge"
        style={{
          clipPath: clip,
          boxShadow: `inset 0 0 0 1.6px hsla(${tint}, 0.85), inset 0 0 10px hsla(0,0%,100%,0.55)`,
        }}
      />
      {/* faísca especular */}
      <div
        className="glass-spark"
        style={{
          left: `${sparkle.x}%`,
          top: `${sparkle.y}%`,
          transform: `scale(${sparkle.s})`,
        }}
      />
    </div>
  );
}
