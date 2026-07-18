import { useEffect } from 'react';
import { grabAt, releaseGrab } from '../physics/engine.js';

/**
 * Tap rápido = pluck (dedilhada). Pressionar e arrastar = agarra o fio
 * mais próximo com uma mola macia (moveGrab roda no loop de física) —
 * puxa a cortina e, ao soltar, ela volta balançando.
 * Ignora eventos em elementos de UI (painel, post-its).
 */
export function useClickPluck(sceneRef, worldRef, onPluck) {
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return undefined;

    let down = null;

    const onDown = (e) => {
      if (e.target.closest('[data-ui]')) return;
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
      if (worldRef.current) grabAt(worldRef.current, e.clientX, e.clientY);
    };
    const onUp = (e) => {
      if (worldRef.current) releaseGrab(worldRef.current);
      if (!down) return;
      const dt = performance.now() - down.t;
      const dist = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      if (dt < 260 && dist < 12) onPluck(down.x, down.y);
      down = null;
    };

    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [sceneRef, worldRef, onPluck]);
}
