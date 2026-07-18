import { CordAndTube } from './CordAndTube.jsx';

/**
 * Orquestra os fios: um SVG com as linhas (polylines atualizadas por ref a
 * cada frame de física) e os elementos pendurados (Framer Motion).
 */
export function HangingSystem({ width, height, strands, cordRefs }) {
  return (
    <div className="hanging-system">
      <svg
        className="cords"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
      >
        {strands.map((strand) => (
          <polyline
            key={strand.id}
            ref={(el) => {
              cordRefs.current[strand.index] = el;
            }}
            points={`${strand.anchor.x},${strand.anchor.y} ${strand.anchor.x},${strand.anchor.y + strand.cordLen}`}
            className="cord-line"
          />
        ))}
      </svg>
      {strands.map((strand) => (
        <CordAndTube key={strand.id} strand={strand} />
      ))}
    </div>
  );
}
