import { motion } from 'framer-motion';
import { BambooPieceVisual } from './BambooPieceVisual.jsx';
import { GlassShardVisual } from './GlassShardVisual.jsx';

/**
 * Um fio pendurado: renderiza os elementos físicos do fio (tubo único de
 * bambu, ou a corrente de caquinhos de vidro). O fio em si (polyline) vive
 * no SVG do HangingSystem, atualizado por ref a cada frame. Cada elemento
 * é desenhado pelo Framer Motion a partir dos motion values — sem re-render.
 */
export function CordAndTube({ strand }) {
  return strand.elements.map((el) =>
    el.mv ? (
      <motion.div
        key={el.key}
        className={`piece ${strand.type === 'chain' ? 'piece-sm' : 'piece-tube'}`}
        style={{
          width: el.w,
          height: el.h,
          x: el.mv.x,
          y: el.mv.y,
          rotate: el.mv.rotate,
        }}
      >
        {strand.type === 'tube' ? (
          <BambooPieceVisual w={el.w} h={el.h} index={strand.index} />
        ) : (
          <GlassShardVisual w={el.w} h={el.h} index={strand.index * 8 + el.seg} />
        )}
      </motion.div>
    ) : null
  );
}
