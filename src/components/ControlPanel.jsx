import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppState } from '../state/AppStateContext.jsx';
import { AudioEngine } from '../audio/AudioEngine.js';
import { usePomodoro } from '../hooks/usePomodoro.js';
import {
  BambooIcon,
  GlassIcon,
  CameraIcon,
  PaletteIcon,
  DensityIcon,
  SunIcon,
  MoonIcon,
  AutoCycleIcon,
  NotesIcon,
  WavesIcon,
  TimerIcon,
  WindIcon,
  RainIcon,
  ForestIcon,
  SilenceIcon,
  InfoIcon,
} from './icons/index.jsx';

const BG_PRESETS = [
  { color: '#e9e1d0', name: 'Linho' },
  { color: '#ddd0bb', name: 'Areia' },
  { color: '#c7cec4', name: 'Sálvia' },
  { color: '#211d19', name: 'Noite' },
  { color: '#2b3038', name: 'Índigo' },
];

const SOUNDSCAPES = [
  { id: 'none', label: 'Silêncio', Icon: SilenceIcon },
  { id: 'wind', label: 'Vento suave', Icon: WindIcon },
  { id: 'rain', label: 'Chuva leve', Icon: RainIcon },
  { id: 'forest', label: 'Floresta', Icon: ForestIcon },
];

const DENSITIES = [
  { count: 12, label: 'Leve' },
  { count: 20, label: 'Média' },
  { count: 28, label: 'Cheia' },
];

function IconButton({ label, active, warn, onClick, children }) {
  return (
    <button
      type="button"
      className={`icon-btn ${active ? 'is-active' : ''} ${warn ? 'is-warn' : ''}`}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      data-tip={label}
    >
      {children}
    </button>
  );
}

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Barra superior discreta: só ícones (mesmo sistema visual), com popovers
 * pequenos para paleta, paisagem sonora, densidade e pomodoro.
 */
export function ControlPanel() {
  const {
    materialType,
    setMaterialType,
    cameraEnabled,
    setCameraEnabled,
    cameraStatus,
    backgroundColor,
    setBackgroundColor,
    compositionMode,
    setCompositionMode,
    soundscape,
    setSoundscape,
    ambientVolume,
    setAmbientVolume,
    dayNightMode,
    setDayNightMode,
    pieceDensity,
    setPieceDensity,
    setSceneQuiet,
  } = useAppState();

  const [openMenu, setOpenMenu] = useState(null); // palette | sound | density | pomodoro
  const panelRef = useRef(null);

  // fecha popover ao clicar fora
  useEffect(() => {
    if (!openMenu) return undefined;
    const onDown = (e) => {
      if (!panelRef.current?.contains(e.target)) setOpenMenu(null);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [openMenu]);

  const toggleMenu = (id) => setOpenMenu((cur) => (cur === id ? null : id));

  const camFailed = cameraStatus === 'denied' || cameraStatus === 'error';

  const cycleDayNight = () => {
    const order = ['auto', 'day', 'night'];
    setDayNightMode(order[(order.indexOf(dayNightMode) + 1) % order.length]);
  };
  const DayNightIcon =
    dayNightMode === 'day' ? SunIcon : dayNightMode === 'night' ? MoonIcon : AutoCycleIcon;

  const pickSoundscape = (id) => {
    setSoundscape(id);
    AudioEngine.ensure();
    AudioEngine.setBed(id);
  };
  const onAmbientVolume = (v) => {
    setAmbientVolume(v);
    AudioEngine.setAmbientVolume(v);
  };

  const toggleComposition = () => {
    const next = !compositionMode;
    setCompositionMode(next);
    AudioEngine.setCompositionMode(next);
  };

  const onFocusChange = useCallback((focusActive) => setSceneQuiet(focusActive), [setSceneQuiet]);
  const pomo = usePomodoro({ onFocusChange });

  return (
    <header className="topbar" data-ui="true" ref={panelRef}>
      <div className="brand">
        <span className="brand-name">Tilim</span>
        <span className="brand-div" aria-hidden="true">
          |
        </span>
        <span className="brand-jp">
          風鈴 <em>(fūrin · sino de vento)</em>
        </span>
        <span className="brand-div brand-div-2" aria-hidden="true">
          |
        </span>
        <span className="brand-sub">notas &amp; pausas</span>
      </div>

      <nav className="topbar-controls" aria-label="Controles">
        <div className="bar-group">
          <IconButton
            label="Bambu"
            active={materialType === 'bamboo'}
            onClick={() => setMaterialType('bamboo')}
          >
            <BambooIcon />
          </IconButton>
          <IconButton
            label="Vidro"
            active={materialType === 'glass'}
            onClick={() => setMaterialType('glass')}
          >
            <GlassIcon />
          </IconButton>
        </div>

        <span className="bar-sep" aria-hidden="true" />

        <div className="bar-group">
          <IconButton
            label={
              camFailed && cameraEnabled
                ? 'Câmera indisponível — mouse segue funcionando'
                : cameraStatus === 'active'
                  ? 'Rastreando a mão'
                  : 'Câmera (tocar com a mão)'
            }
            active={cameraEnabled && !camFailed}
            warn={cameraEnabled && camFailed}
            onClick={() => setCameraEnabled(!cameraEnabled)}
          >
            <CameraIcon />
          </IconButton>
          <IconButton
            label={`Ciclo: ${dayNightMode === 'auto' ? 'automático' : dayNightMode === 'day' ? 'dia' : 'noite'}`}
            active={dayNightMode !== 'auto'}
            onClick={cycleDayNight}
          >
            <DayNightIcon />
          </IconButton>
          <IconButton
            label={compositionMode ? 'Modo composição ligado (pitch fixo)' : 'Modo composição (kalimba)'}
            active={compositionMode}
            onClick={toggleComposition}
          >
            <NotesIcon />
          </IconButton>
        </div>

        <span className="bar-sep" aria-hidden="true" />

        <div className="bar-group">
          <div className="menu-anchor">
            <IconButton
              label="Paisagem sonora"
              active={soundscape !== 'none' || openMenu === 'sound'}
              onClick={() => toggleMenu('sound')}
            >
              <WavesIcon />
            </IconButton>
            {openMenu === 'sound' && (
              <div className="popover" role="menu">
                <p className="pop-title">Paisagem sonora</p>
                {SOUNDSCAPES.map(({ id, label, Icon: OptIcon }) => (
                  <button
                    key={id}
                    type="button"
                    className={`pop-option ${soundscape === id ? 'is-active' : ''}`}
                    onClick={() => pickSoundscape(id)}
                  >
                    <OptIcon size={15} />
                    {label}
                  </button>
                ))}
                <label className="pop-slider">
                  volume
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={ambientVolume}
                    onChange={(e) => onAmbientVolume(Number(e.target.value))}
                    aria-label="Volume da paisagem sonora"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="menu-anchor">
            <IconButton
              label="Cor de fundo"
              active={openMenu === 'palette'}
              onClick={() => toggleMenu('palette')}
            >
              <PaletteIcon />
            </IconButton>
            {openMenu === 'palette' && (
              <div className="popover">
                <p className="pop-title">Fundo</p>
                <div className="pop-swatches">
                  {BG_PRESETS.map((p) => (
                    <button
                      key={p.color}
                      type="button"
                      title={p.name}
                      className={`swatch ${backgroundColor === p.color ? 'is-active' : ''}`}
                      style={{ background: p.color }}
                      onClick={() => setBackgroundColor(p.color)}
                      aria-label={`Fundo ${p.name}`}
                    />
                  ))}
                  <label className="swatch swatch-custom" title="Cor personalizada">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      aria-label="Cor personalizada de fundo"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="menu-anchor">
            <IconButton
              label="Quantidade de peças"
              active={openMenu === 'density'}
              onClick={() => toggleMenu('density')}
            >
              <DensityIcon />
            </IconButton>
            {openMenu === 'density' && (
              <div className="popover">
                <p className="pop-title">Peças</p>
                {DENSITIES.map(({ count, label }) => (
                  <button
                    key={count}
                    type="button"
                    className={`pop-option ${pieceDensity === count ? 'is-active' : ''}`}
                    onClick={() => setPieceDensity(count)}
                  >
                    <DensityIcon size={15} />
                    {label} · {count}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="menu-anchor">
            <IconButton
              label="Como usar"
              active={openMenu === 'info'}
              onClick={() => toggleMenu('info')}
            >
              <InfoIcon />
            </IconButton>
            {openMenu === 'info' && (
              <div className="popover pop-info">
                <p className="pop-title">Tilim</p>
                <p className="info-text">
                  Uma companhia de pausa e foco: deixe aberto enquanto trabalha,
                  volte o olhar por alguns segundos, toque de leve, siga.
                </p>
                <ul className="info-list">
                  <li>mova o mouse (ou o dedo) — vento na cortina</li>
                  <li>toque rápido — dedilha uma nota</li>
                  <li>arraste um fio — puxa a cortina, solte e ela volta</li>
                  <li>demore sobre uma peça — um tom contínuo cresce</li>
                  <li>com a câmera: a mão vira o vento</li>
                  <li>
                    post-its: <b>+</b> cria; arraste com o mouse; mão aberta
                    pega, mão fechada solta, "tchau" apaga
                  </li>
                  <li>concluiu uma tarefa? a nota ganha brilho</li>
                </ul>
                <p className="info-meaning">
                  Carrilhões de vento existem em muitas culturas como um
                  lembrete da passagem do tempo e da presença do que não vemos.
                  Aqui o ritual vira digital — o mesmo convite: parar, tocar de
                  leve, e ouvir algo que só existe naquele instante.
                </p>
              </div>
            )}
          </div>

          <div className="menu-anchor">
            <IconButton
              label="Pomodoro"
              active={pomo.running || openMenu === 'pomodoro'}
              onClick={() => toggleMenu('pomodoro')}
            >
              <TimerIcon />
            </IconButton>
            {openMenu === 'pomodoro' && (
              <div className="popover pop-pomodoro">
                <p className="pop-title">
                  Pomodoro · {pomo.phase === 'focus' ? 'foco' : 'pausa'}
                </p>
                <p className="pomo-time">{fmt(pomo.remaining)}</p>
                <div className="pomo-actions">
                  <button
                    type="button"
                    className="pop-option is-primary"
                    onClick={pomo.running ? pomo.pause : pomo.start}
                  >
                    {pomo.running ? 'Pausar' : 'Iniciar'}
                  </button>
                  <button type="button" className="pop-option" onClick={pomo.reset}>
                    Zerar
                  </button>
                </div>
                <div className="pomo-durations">
                  <span>
                    foco
                    <button type="button" onClick={() => pomo.adjustWork(-5)} aria-label="Menos foco">−</button>
                    <b>{pomo.workMin}m</b>
                    <button type="button" onClick={() => pomo.adjustWork(5)} aria-label="Mais foco">+</button>
                  </span>
                  <span>
                    pausa
                    <button type="button" onClick={() => pomo.adjustBreak(-1)} aria-label="Menos pausa">−</button>
                    <b>{pomo.breakMin}m</b>
                    <button type="button" onClick={() => pomo.adjustBreak(1)} aria-label="Mais pausa">+</button>
                  </span>
                </div>
                <p className="pomo-note">a virada de fase soa no próprio carrilhão</p>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
