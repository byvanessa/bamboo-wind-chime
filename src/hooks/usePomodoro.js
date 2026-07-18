import { useEffect, useRef, useState } from 'react';

/**
 * Pomodoro desacoplado do carrilhão: conta em tempo real (Date.now(),
 * então segue correto com a aba em segundo plano) e, na virada de fase,
 * dispara o evento 'chime:pomodoro-chime' — a cena responde dedilhando
 * 2-3 peças, em vez de um alarme genérico.
 */
export function usePomodoro({ onFocusChange } = {}) {
  const [workMin, setWorkMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [phase, setPhase] = useState('focus'); // focus | break
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(25 * 60);
  const endsAtRef = useRef(null);

  const durOf = (ph) => (ph === 'focus' ? workMin : breakMin) * 60;

  // avisa a cena quando entra/sai de foco ativo (rajadas mais quietas)
  useEffect(() => {
    onFocusChange?.(running && phase === 'focus');
  }, [running, phase, onFocusChange]);

  useEffect(() => {
    if (!running) return undefined;
    if (!endsAtRef.current) endsAtRef.current = Date.now() + remaining * 1000;

    const tick = () => {
      const left = Math.round((endsAtRef.current - Date.now()) / 1000);
      if (left <= 0) {
        const next = phase === 'focus' ? 'break' : 'focus';
        window.dispatchEvent(new CustomEvent('chime:pomodoro-chime', { detail: { to: next } }));
        setPhase(next);
        const nextDur = (next === 'focus' ? workMin : breakMin) * 60;
        endsAtRef.current = Date.now() + nextDur * 1000;
        setRemaining(nextDur);
      } else {
        setRemaining(left);
      }
    };

    const id = setInterval(tick, 500);
    const onVisible = () => tick(); // re-sincroniza ao voltar pra aba
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase, workMin, breakMin]);

  const start = () => {
    endsAtRef.current = Date.now() + remaining * 1000;
    setRunning(true);
  };
  const pause = () => {
    endsAtRef.current = null;
    setRunning(false);
  };
  const reset = () => {
    setRunning(false);
    endsAtRef.current = null;
    setPhase('focus');
    setRemaining(workMin * 60);
  };
  const adjustWork = (delta) => {
    const v = Math.max(5, Math.min(90, workMin + delta));
    setWorkMin(v);
    if (!running && phase === 'focus') setRemaining(v * 60);
  };
  const adjustBreak = (delta) => {
    const v = Math.max(3, Math.min(30, breakMin + delta));
    setBreakMin(v);
    if (!running && phase === 'break') setRemaining(v * 60);
  };

  return {
    running,
    phase,
    remaining,
    workMin,
    breakMin,
    start,
    pause,
    reset,
    adjustWork,
    adjustBreak,
    durOf,
  };
}
