import { useEffect } from 'react';
import { mouseMayWrite, writePointer } from './InputManager.js';

/** Fonte contínua padrão: posição do mouse/toque sobre a cena. */
export function useMouseInput(pointerRef, cameraEnabledRef) {
  useEffect(() => {
    const onMove = (e) => {
      if (e.pointerType === 'touch') return; // toque tem hook próprio
      const p = pointerRef.current;
      if (!mouseMayWrite(p, cameraEnabledRef.current)) return;
      writePointer(p, e.clientX, e.clientY, 'mouse', performance.now());
    };
    const onLeave = () => {
      const p = pointerRef.current;
      if (p.source === 'mouse') {
        p.active = false;
        p.vx = 0;
        p.vy = 0;
      }
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [pointerRef, cameraEnabledRef]);
}
