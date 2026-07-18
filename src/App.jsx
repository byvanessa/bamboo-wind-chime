import { useEffect } from 'react';
import { AppStateProvider, useAppState } from './state/AppStateContext.jsx';
import { ChimeScene } from './components/ChimeScene.jsx';
import { ControlPanel } from './components/ControlPanel.jsx';
import { PostItsLayer } from './components/PostItsLayer.jsx';
import { SoundButton } from './components/SoundButton.jsx';
import { MobileNotice } from './components/MobileNotice.jsx';

function relativeLuminance(hex) {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(full.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Aplica a cor de fundo em --bg-color e ajusta a "tinta" (texto/UI) para
 *  manter contraste mínimo sobre qualquer fundo escolhido. */
function BackgroundColorEffect() {
  const { backgroundColor } = useAppState();
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bg-color', backgroundColor);
    const dark = relativeLuminance(backgroundColor) < 0.35;
    root.dataset.sceneTheme = dark ? 'dark' : 'light';
  }, [backgroundColor]);
  return null;
}

/**
 * Ciclo dia/noite: em modo auto lê a hora local (6h-18h = dia), reavaliando
 * a cada minuto e ao voltar pra aba. Modos manuais sobrepõem. O resultado
 * dirige o fundo padrão (sem sobrescrever escolha manual de cor) e o tipo
 * de partícula (folha/vagalume).
 */
function DayNightEffect() {
  const { dayNightMode, setIsNight, applyAutoBackground } = useAppState();
  useEffect(() => {
    const evaluate = () => {
      const hour = new Date().getHours();
      const night =
        dayNightMode === 'night' || (dayNightMode === 'auto' && (hour < 6 || hour >= 18));
      setIsNight(night);
      applyAutoBackground(night);
    };
    evaluate();
    const id = setInterval(evaluate, 60000);
    document.addEventListener('visibilitychange', evaluate);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', evaluate);
    };
  }, [dayNightMode, setIsNight, applyAutoBackground]);
  return null;
}

export default function App() {
  return (
    <AppStateProvider>
      <BackgroundColorEffect />
      <DayNightEffect />
      <ChimeScene />
      <PostItsLayer />
      <ControlPanel />
      <SoundButton />
      <MobileNotice />
    </AppStateProvider>
  );
}
