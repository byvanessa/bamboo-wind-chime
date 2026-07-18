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

/**
 * Tubo de bambu — cilindro fosco em SVG: sombreamento lateral de cilindro,
 * nós (anéis) característicos e leve variação de tom por peça.
 */
export function BambooPieceVisual({ w, h, index }) {
  const { hueShift, nodes, seedTone } = useMemo(() => {
    const rnd = mulberry32(1000 + index * 97);
    const n = [0.24 + rnd() * 0.08, 0.62 + rnd() * 0.1];
    return { hueShift: (rnd() - 0.5) * 14, nodes: n, seedTone: 0.9 + rnd() * 0.2 };
  }, [index]);

  const gid = `bam-${index}`;
  const r = w / 2;

  return (
    <svg
      className="piece-svg"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ filter: `hue-rotate(${hueShift}deg) brightness(${seedTone})` }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${gid}-body`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7a5a2e" />
          <stop offset="0.22" stopColor="#c9a55e" />
          <stop offset="0.5" stopColor="#e3c684" />
          <stop offset="0.78" stopColor="#b28c48" />
          <stop offset="1" stopColor="#6b4c24" />
        </linearGradient>
        <linearGradient id={`${gid}-sheen`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.3" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.42" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.54" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width={w} height={h} rx={r} fill={`url(#${gid}-body)`} />
      {/* veio vertical sutil */}
      {[0.3, 0.52, 0.72].map((fx, i) => (
        <line
          key={i}
          x1={w * fx}
          y1={r * 0.8}
          x2={w * (fx + 0.02)}
          y2={h - r * 0.8}
          stroke="#5f431f"
          strokeWidth="0.7"
          opacity="0.35"
        />
      ))}
      {/* nós do bambu */}
      {nodes.map((fy, i) => (
        <g key={i}>
          <rect x="0" y={h * fy - 2.5} width={w} height="5" rx="2.5" fill="#8a6832" opacity="0.9" />
          <rect x="0" y={h * fy - 2.5} width={w} height="1.6" fill="#5a3f1c" opacity="0.7" />
          <rect x="0" y={h * fy + 1} width={w} height="1.2" fill="#f0d79a" opacity="0.5" />
        </g>
      ))}
      {/* brilho fosco do cilindro */}
      <rect x="0" y="0" width={w} height={h} rx={r} fill={`url(#${gid}-sheen)`} />
      {/* boca superior (corte do tubo) */}
      <ellipse cx={w / 2} cy={r * 0.9} rx={w * 0.32} ry={r * 0.34} fill="#3d2a12" opacity="0.85" />
      <ellipse cx={w / 2} cy={r * 0.82} rx={w * 0.32} ry={r * 0.3} fill="none" stroke="#e9d194" strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
}
