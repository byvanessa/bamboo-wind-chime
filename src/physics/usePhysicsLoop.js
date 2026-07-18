/**
 * Ponte Matter → Framer Motion.
 * A cada frame de física, escreve posição/ângulo de cada elemento em motion
 * values (transform via GPU, sem re-render) e atualiza os fios (SVG
 * polylines) imperativamente via refs.
 *
 * Como o número de corpos varia por material (tubo único vs. corrente de
 * caquinhos), os motion values são criados imperativamente (motionValue())
 * e anexados a cada elemento quando o mundo é construído.
 */
import { useEffect, useRef } from 'react';
import { motionValue } from 'framer-motion';
import Matter from 'matter-js';
import { applyFrameForces } from './engine.js';

/** Anexa motion values a cada elemento do mundo recém-criado. */
export function attachMotionValues(world) {
  for (const strand of world.strands) {
    for (const el of strand.elements) {
      const b = el.body;
      el.mv = {
        x: motionValue(b.position.x - el.w / 2),
        y: motionValue(b.position.y - el.h / 2),
        rotate: motionValue(0),
      };
    }
  }
  return world;
}

/**
 * Loop rAF: forças do frame → Engine.update → escreve motion values.
 * @param worldRef ref para o mundo (pode trocar em resize/material)
 * @param pointerRef estado compartilhado do ponteiro
 * @param cordRefs ref para mapa strandIndex -> <polyline>
 * @param onFrame callback por frame (luz, cursor da mão…)
 */
export function usePhysicsLoop(worldRef, pointerRef, cordRefs, onFrame) {
  const running = useRef(true);

  useEffect(() => {
    running.current = true;
    let rafId;
    let last = performance.now();
    const t0 = last;

    const step = (now) => {
      if (!running.current) return;
      rafId = requestAnimationFrame(step);

      const world = worldRef.current;
      if (!world) {
        last = now;
        return;
      }

      const dt = Math.min(now - last, 34);
      last = now;
      const tSec = (now - t0) / 1000;
      const pointer = pointerRef.current;

      if (pointer.active) {
        Matter.Body.setPosition(world.pointerBody, { x: pointer.x, y: pointer.y });
      } else {
        Matter.Body.setPosition(world.pointerBody, { x: -1000, y: -1000 });
      }

      // fio agarrado segue o ponteiro (puxar a cortina)
      if (world.grab && pointer.active) {
        world.grab.constraint.pointA.x = pointer.x;
        world.grab.constraint.pointA.y = pointer.y;
      }

      applyFrameForces(world, tSec, pointer);
      Matter.Engine.update(world.engine, dt);

      for (const strand of world.strands) {
        // fio: âncora → topo do primeiro elemento → centros seguintes
        let points = `${strand.anchor.x},${strand.anchor.y}`;

        for (const el of strand.elements) {
          const b = el.body;
          if (!el.mv) continue;
          el.mv.x.set(b.position.x - el.w / 2);
          el.mv.y.set(b.position.y - el.h / 2);
          el.mv.rotate.set((b.angle * 180) / Math.PI);

          const sin = Math.sin(b.angle);
          const cos = Math.cos(b.angle);
          const topX = b.position.x + (el.h / 2) * sin;
          const topY = b.position.y - (el.h / 2) * cos;
          points += ` ${topX},${topY} ${b.position.x},${b.position.y}`;
        }

        const line = cordRefs.current[strand.index];
        if (line) line.setAttribute('points', points);
      }

      if (onFrame) onFrame(pointer, tSec);
    };

    rafId = requestAnimationFrame(step);
    return () => {
      running.current = false;
      cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
