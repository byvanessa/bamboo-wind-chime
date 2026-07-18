import { useEffect } from 'react';
import { writePointer } from './InputManager.js';

/**
 * Toque (mobile): touchmove contínuo = hover (mesma interface
 * { posição, velocidade } do mouse/mão); o pluck do touchstart já é
 * coberto pelo useClickPluck (pointerdown dispara também para toque).
 * Ao levantar o dedo o ponteiro desativa — sem cursor fantasma parado.
 */
export function useTouchInput(pointerRef) {
  useEffect(() => {
    const write = (touch) => {
      writePointer(
        pointerRef.current,
        touch.clientX,
        touch.clientY,
        'touch',
        performance.now()
      );
    };
    const onStart = (e) => {
      if (e.target.closest('[data-ui]')) return;
      write(e.touches[0]);
    };
    const onMove = (e) => {
      if (e.target.closest('[data-ui]')) return;
      write(e.touches[0]);
    };
    const onEnd = () => {
      const p = pointerRef.current;
      if (p.source === 'touch') {
        p.active = false;
        p.vx = 0;
        p.vy = 0;
      }
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [pointerRef]);
}
