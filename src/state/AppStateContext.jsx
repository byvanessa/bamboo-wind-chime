import { createContext, useContext, useMemo, useRef, useState, useCallback } from 'react';
import { DEFAULT_TUBE_COUNT } from '../config/tubes.config.js';

const AppStateContext = createContext(null);

export const DAY_BG = '#e9e1d0';
export const NIGHT_BG = '#211d19';
export const DEFAULT_BG = DAY_BG;

export function AppStateProvider({ children }) {
  const [materialType, setMaterialType] = useState('bamboo');
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('idle'); // idle | loading | active | denied | error
  const [backgroundColor, setBackgroundColorState] = useState(DEFAULT_BG);

  // companhia de pausa e foco
  const [compositionMode, setCompositionMode] = useState(false);
  const [soundscape, setSoundscape] = useState('none'); // none | wind | rain | forest
  const [ambientVolume, setAmbientVolume] = useState(0.5);
  const [dayNightMode, setDayNightMode] = useState('auto'); // auto | day | night
  const [isNight, setIsNight] = useState(false);
  const [pieceDensity, setPieceDensity] = useState(DEFAULT_TUBE_COUNT); // nº de peças
  const [sceneQuiet, setSceneQuiet] = useState(false); // pomodoro em foco

  // fundo escolhido manualmente não é sobrescrito pelo ciclo dia/noite
  const bgChosenRef = useRef(false);
  const setBackgroundColor = useCallback((color) => {
    bgChosenRef.current = true;
    setBackgroundColorState(color);
  }, []);
  const applyAutoBackground = useCallback((night) => {
    if (!bgChosenRef.current) setBackgroundColorState(night ? NIGHT_BG : DAY_BG);
  }, []);

  const value = useMemo(
    () => ({
      materialType,
      setMaterialType,
      cameraEnabled,
      setCameraEnabled,
      cameraStatus,
      setCameraStatus,
      backgroundColor,
      setBackgroundColor,
      applyAutoBackground,
      compositionMode,
      setCompositionMode,
      soundscape,
      setSoundscape,
      ambientVolume,
      setAmbientVolume,
      dayNightMode,
      setDayNightMode,
      isNight,
      setIsNight,
      pieceDensity,
      setPieceDensity,
      sceneQuiet,
      setSceneQuiet,
    }),
    [
      materialType,
      cameraEnabled,
      cameraStatus,
      backgroundColor,
      setBackgroundColor,
      applyAutoBackground,
      compositionMode,
      soundscape,
      ambientVolume,
      dayNightMode,
      isNight,
      pieceDensity,
      sceneQuiet,
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside <AppStateProvider>');
  return ctx;
}
