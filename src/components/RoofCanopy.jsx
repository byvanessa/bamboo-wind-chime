import { useMemo } from 'react';
import { TUBES } from '../config/tubes.config.js';

/**
 * Telhado de quatro águas realista — SVG procedural, sem imagens:
 * telhas capa-e-canal em colunas (pattern), platibanda branca com
 * coruchéus, cúpula central com veneziana e galo de vento, sombra
 * longa projetada na parede. A viga de suspensão da cortina fica
 * logo abaixo do beiral.
 */
export function RoofCanopy({ width, height, geo, tubes = TUBES }) {
  const { cx, ridgeY, eaveY, beamY, roofW, innerHalf } = geo;
  const s = Math.min(roofW / 560, 1.15); // adornos não crescem sem limite

  const g = useMemo(() => {
    const L = cx - roofW / 2;
    const R = cx + roofW / 2;
    const ridgeW = roofW * 0.54;
    const rl = cx - ridgeW / 2;
    const rr = cx + ridgeW / 2;

    const roofPath = `M ${rl} ${ridgeY} L ${rr} ${ridgeY} L ${R} ${eaveY} L ${L} ${eaveY} Z`;
    // águas laterais (dobras do telhado)
    const hipL = `M ${rl} ${ridgeY} L ${L} ${eaveY} L ${L + roofW * 0.16} ${eaveY} Z`;
    const hipR = `M ${rr} ${ridgeY} L ${R} ${eaveY} L ${R - roofW * 0.16} ${eaveY} Z`;

    return { L, R, rl, rr, ridgeW, roofPath, hipL, hipR };
  }, [cx, ridgeY, eaveY, roofW]);

  const { L, R, rl, rr, roofPath, hipL, hipR } = g;

  // adornos (px escalados)
  const parapetH = 9 * s;
  const postW = 8 * s;
  const postH = 15 * s;
  const cupolaW = 46 * s;
  const cupolaH = 26 * s;
  const capH = 18 * s;
  const vaneH = 22 * s;
  const cupolaBaseY = ridgeY - parapetH - cupolaH;
  const capTopY = cupolaBaseY - capH;

  const postXs = [rl - 4 * s, rl + (rr - rl) * 0.27, rr - (rr - rl) * 0.27, rr + 4 * s];

  return (
    <svg
      className="roof-canopy"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="tileGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d0673c" />
          <stop offset="0.55" stopColor="#c05430" />
          <stop offset="1" stopColor="#a84424" />
        </linearGradient>
        {/* telhas capa-e-canal: colunas retas, fiadas em escamas */}
        <pattern id="tiles" width={16 * s} height={12 * s} patternUnits="userSpaceOnUse">
          <rect width={16 * s} height={12 * s} fill="#93381d" />
          <path
            d={`M ${1 * s} 0 H ${15 * s} V ${7 * s} A ${7 * s} ${4.6 * s} 0 0 1 ${1 * s} ${7 * s} Z`}
            fill="url(#tileGrad)"
          />
          <rect x={1 * s} width={14 * s} height={1.6 * s} fill="#e0895c" opacity="0.45" />
        </pattern>
        <linearGradient id="roofLight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffdcb0" stopOpacity="0.22" />
          <stop offset="0.4" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#511d08" stopOpacity="0.26" />
        </linearGradient>
        <linearGradient id="stoneGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4eee1" />
          <stop offset="1" stopColor="#d8cfbc" />
        </linearGradient>
        <filter id="roofBlur" x="-40%" y="-40%" width="180%" height="220%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
        <clipPath id="roofClip">
          <path d={roofPath} />
        </clipPath>
      </defs>

      {/* sombra longa projetada na parede */}
      <g
        transform={`translate(${roofW * 0.16}, ${roofW * 0.1}) skewX(-16)`}
        opacity="0.13"
      >
        <path d={roofPath} fill="#241a10" filter="url(#roofBlur)" />
        <rect
          x={cx - roofW * 0.1}
          y={eaveY}
          width={roofW * 0.62}
          height={roofW * 0.5}
          fill="#241a10"
          filter="url(#roofBlur)"
        />
      </g>

      {/* água frontal com telhas */}
      <path d={roofPath} fill="url(#tiles)" />
      <path d={roofPath} fill="url(#roofLight)" />
      {/* águas laterais mais escuras + aresta de luz nas espigas */}
      <path d={hipL} fill="#7e2f16" opacity="0.42" clipPath="url(#roofClip)" />
      <path d={hipR} fill="#7e2f16" opacity="0.42" clipPath="url(#roofClip)" />
      <path d={`M ${rl} ${ridgeY} L ${L} ${eaveY}`} stroke="#e8a578" strokeWidth={1.6 * s} opacity="0.6" />
      <path d={`M ${rr} ${ridgeY} L ${R} ${eaveY}`} stroke="#e8a578" strokeWidth={1.6 * s} opacity="0.6" />

      {/* beiral: fiada de remate + testeira clara + sombra por baixo */}
      <rect x={L - 6 * s} y={eaveY - 3 * s} width={roofW + 12 * s} height={5 * s} rx={2.5 * s} fill="#a84424" />
      <rect x={L - 6 * s} y={eaveY + 2 * s} width={roofW + 12 * s} height={4 * s} rx={2 * s} fill="url(#stoneGrad)" />
      <rect x={L - 6 * s} y={eaveY + 6 * s} width={roofW + 12 * s} height={5 * s} fill="#241a10" opacity="0.22" />

      {/* platibanda branca sobre a cumeeira */}
      <rect x={rl - 10 * s} y={ridgeY - parapetH} width={rr - rl + 20 * s} height={parapetH + 2 * s} rx={2 * s} fill="url(#stoneGrad)" />
      <rect x={rl - 10 * s} y={ridgeY - parapetH} width={rr - rl + 20 * s} height={2.2 * s} fill="#fffaf0" opacity="0.9" />

      {/* balaústres com remates em bola */}
      {postXs.map((px, i) => (
        <g key={i}>
          <rect x={px - postW / 2} y={ridgeY - parapetH - postH} width={postW} height={postH} rx={1.5 * s} fill="url(#stoneGrad)" />
          <rect x={px - postW * 0.8} y={ridgeY - parapetH - postH - 3 * s} width={postW * 1.6} height={3.4 * s} rx={1.6 * s} fill="#efe7d7" />
          <circle cx={px} cy={ridgeY - parapetH - postH - 7 * s} r={3.8 * s} fill="url(#stoneGrad)" />
          <circle cx={px - 1.2 * s} cy={ridgeY - parapetH - postH - 8 * s} r={1.2 * s} fill="#fffaf0" opacity="0.8" />
        </g>
      ))}

      {/* coruchéus dos cantos do beiral */}
      {[L + 10 * s, R - 10 * s].map((px, i) => (
        <g key={i}>
          <rect x={px - 8 * s} y={eaveY - 20 * s} width={16 * s} height={20 * s} rx={2 * s} fill="url(#stoneGrad)" />
          <rect x={px - 10 * s} y={eaveY - 23 * s} width={20 * s} height={4 * s} rx={2 * s} fill="#efe7d7" />
          <ellipse cx={px} cy={eaveY - 29 * s} rx={5 * s} ry={6 * s} fill="url(#stoneGrad)" />
          <path d={`M ${px} ${eaveY - 40 * s} L ${px + 2.4 * s} ${eaveY - 34 * s} L ${px - 2.4 * s} ${eaveY - 34 * s} Z`} fill="#d8cfbc" />
        </g>
      ))}

      {/* cúpula central: base com veneziana + coifa de telhas + galo de vento */}
      <g>
        <rect x={cx - cupolaW / 2} y={cupolaBaseY} width={cupolaW} height={cupolaH} rx={2 * s} fill="url(#stoneGrad)" />
        <rect x={cx - cupolaW * 0.32} y={cupolaBaseY + 5 * s} width={cupolaW * 0.64} height={cupolaH - 9 * s} rx={2 * s} fill="#5a4433" />
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            x={cx - cupolaW * 0.28}
            y={cupolaBaseY + 7.5 * s + i * 4.6 * s}
            width={cupolaW * 0.56}
            height={2 * s}
            rx={s}
            fill="#2e2218"
          />
        ))}
        <path
          d={`M ${cx - cupolaW / 2 - 5 * s} ${cupolaBaseY} L ${cx - 9 * s} ${capTopY} L ${cx + 9 * s} ${capTopY} L ${cx + cupolaW / 2 + 5 * s} ${cupolaBaseY} Z`}
          fill="url(#tileGrad)"
        />
        <path
          d={`M ${cx - cupolaW / 2 - 5 * s} ${cupolaBaseY} L ${cx - 9 * s} ${capTopY}`}
          stroke="#e8a578"
          strokeWidth={1.2 * s}
          opacity="0.7"
        />
        <rect x={cx - 10 * s} y={capTopY - 2.6 * s} width={20 * s} height={2.8 * s} rx={1.4 * s} fill="#efe7d7" />

        {/* galo de vento */}
        <g stroke="#3a3026" strokeWidth={1.6 * s} strokeLinecap="round">
          <line x1={cx} y1={capTopY - 2.6 * s} x2={cx} y2={capTopY - vaneH} />
          <line x1={cx - 9 * s} y1={capTopY - vaneH * 0.55} x2={cx + 9 * s} y2={capTopY - vaneH * 0.55} />
        </g>
        <path
          d={`M ${cx - 9 * s} ${capTopY - vaneH * 0.55} l ${-4 * s} ${-2.6 * s} v ${5.2 * s} Z`}
          fill="#3a3026"
        />
        <path
          d={`M ${cx + 1 * s} ${capTopY - vaneH}
              c ${3 * s} ${-1 * s} ${5.5 * s} ${-4.5 * s} ${4.5 * s} ${-7.5 * s}
              c ${2.5 * s} ${1.4 * s} ${3.4 * s} ${4 * s} ${2.6 * s} ${6 * s}
              l ${3.4 * s} ${0.4 * s} l ${-2.6 * s} ${2.2 * s}
              c ${1.8 * s} ${2.6 * s} ${0.4 * s} ${5 * s} ${-2.4 * s} ${5.4 * s}
              l ${-1.4 * s} ${2.8 * s} l ${-1.6 * s} ${-2.6 * s}
              l ${-4 * s} ${0.6 * s} Z`}
          fill="#3a3026"
        />
      </g>

      {/* viga de suspensão da cortina */}
      <rect x={cx - innerHalf - 20} y={beamY - 5} width={innerHalf * 2 + 40} height={9} rx={4.5} fill="#3a2f28" />
      <rect x={cx - innerHalf - 20} y={beamY - 5} width={innerHalf * 2 + 40} height={2.4} rx={1.2} fill="#5a4a3c" />

      {/* ganchos */}
      {tubes.map((tube) => {
        const hx = cx + tube.t * 2 * innerHalf;
        return <circle key={tube.id} cx={hx} cy={beamY + 4} r={2.6} fill="#211d19" />;
      })}
    </svg>
  );
}
