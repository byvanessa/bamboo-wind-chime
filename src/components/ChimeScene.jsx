import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppState } from '../state/AppStateContext.jsx';
import { MATERIALS } from '../config/materials.config.js';
import { generateTubes } from '../config/tubes.config.js';
import {
  createChimeWorld,
  destroyWorld,
  bindCollisionSounds,
  pluckAt,
  canopyGeometry,
  startGust,
} from '../physics/engine.js';
import { attachMotionValues, usePhysicsLoop } from '../physics/usePhysicsLoop.js';
import { pointerState } from '../input/InputManager.js';
import { useMouseInput } from '../input/useMouseInput.js';
import { useTouchInput } from '../input/useTouchInput.js';
import { useHandTrackingInput } from '../input/useHandTrackingInput.js';
import { useClickPluck } from '../input/useClickPluck.js';
import { AudioEngine } from '../audio/AudioEngine.js';
import { BackgroundLayer } from './BackgroundLayer.jsx';
import { RoofCanopy } from './RoofCanopy.jsx';
import { HangingSystem } from './HangingSystem.jsx';
import { HeroText } from './HeroText.jsx';
import { ParticleLayer } from './ParticleLayer.jsx';

function useViewport() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    let t;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(() => setSize({ w: window.innerWidth, h: window.innerHeight }), 160);
    };
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
    };
  }, []);
  return size;
}

/**
 * Container raiz da cena: monta o Matter.Engine (headless), conecta input,
 * áudio e as camadas visuais. O mundo é reconstruído ao trocar material
 * (tubo ↔ corrente de caquinhos) ou redimensionar — destruição completa,
 * sem corpos fantasmas.
 */
export function ChimeScene() {
  const { materialType, cameraEnabled, setCameraStatus, pieceDensity, isNight, sceneQuiet } =
    useAppState();
  const material = MATERIALS[materialType];
  const tubes = useMemo(() => generateTubes(pieceDensity), [pieceDensity]);

  const { w, h } = useViewport();
  const sceneRef = useRef(null);
  const handCursorRef = useRef(null);
  const worldRef = useRef(null);
  const cordRefs = useRef([]);
  const pointerRef = useRef(pointerState); // singleton — post-its leem a mesma mão
  const [strands, setStrands] = useState([]);

  const materialRef = useRef(material);
  materialRef.current = material;
  const cameraEnabledRef = useRef(cameraEnabled);
  cameraEnabledRef.current = cameraEnabled;
  const sceneQuietRef = useRef(sceneQuiet);
  sceneQuietRef.current = sceneQuiet;

  // ----- mundo físico: criado no mount, recriado em resize/material/densidade -----
  useEffect(() => {
    const world = attachMotionValues(
      createChimeWorld(w, h, materialType, material.physics, tubes)
    );
    worldRef.current = world;
    cordRefs.current = [];
    setStrands(world.strands);

    const unbind = bindCollisionSounds(world, {
      onKnock: (a, b, intensity) => {
        const audio = materialRef.current.audio;
        const panA = (world.strands[a.strand].anchor.x / w) * 2 - 1;
        AudioEngine.strike(audio, a.freq, 'knock', intensity, a.id, panA);
        AudioEngine.strike(audio, b.freq, 'knock', intensity * 0.55, b.id, panA);
      },
      onTouch: (pieceInfo) => {
        const p = pointerRef.current;
        const speed = Math.hypot(p.vx, p.vy);
        const audio = materialRef.current.audio;
        const pan = (world.strands[pieceInfo.strand].anchor.x / w) * 2 - 1;
        AudioEngine.strike(
          audio,
          pieceInfo.freq,
          'hover',
          Math.min(1, speed / 26),
          pieceInfo.id,
          pan
        );
      },
    });

    return () => {
      unbind();
      destroyWorld(world);
      worldRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, materialType, tubes]);

  // ----- rajadas automáticas de vento (pausam se o usuário interagiu há <2s) -----
  useEffect(() => {
    let timer;
    const schedule = (ms) => {
      timer = setTimeout(fire, ms);
    };
    const fire = () => {
      const world = worldRef.current;
      const idleFor = performance.now() - (pointerRef.current.lastMoveAt || 0);
      if (world && idleFor > 2000 && !document.hidden) {
        startGust(world, {
          strength: (0.6 + Math.random() * 0.5) * (sceneQuietRef.current ? 0.45 : 1),
        });
        schedule(20000 + Math.random() * 20000);
      } else {
        schedule(5000 + Math.random() * 4000); // tenta de novo em breve
      }
    };
    schedule(9000 + Math.random() * 9000);
    return () => clearTimeout(timer);
  }, []);

  // ----- virada do pomodoro: rajada forte + melodia clara no carrilhão -----
  // foco→pausa: escala ascendente (alívio); pausa→foco: descendente (recolher)
  useEffect(() => {
    const onChime = (e) => {
      const world = worldRef.current;
      if (!world) return;
      startGust(world, { strength: 1.9 });

      const n = world.strands.length;
      const picks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (n - 1)));
      const order = e.detail?.to === 'focus' ? picks.reverse() : picks;
      order.forEach((idx, k) => {
        setTimeout(() => {
          const w2 = worldRef.current;
          if (!w2 || !w2.strands[idx]) return;
          const el = w2.strands[idx].elements[0];
          onPluck(el.body.position.x + 4, el.body.position.y);
        }, k * 240);
      });
    };
    window.addEventListener('chime:pomodoro-chime', onChime);
    return () => window.removeEventListener('chime:pomodoro-chime', onChime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- input -----
  useMouseInput(pointerRef, cameraEnabledRef);
  useTouchInput(pointerRef);
  useHandTrackingInput(pointerRef, cameraEnabled, setCameraStatus);

  const onPluck = useCallback((x, y) => {
    AudioEngine.ensure();
    const world = worldRef.current;
    if (!world) return;
    const hit = pluckAt(world, x, y);
    if (hit) {
      const info = hit.el.body.plugin.chime;
      const pan = (hit.strand.anchor.x / window.innerWidth) * 2 - 1;
      AudioEngine.strike(materialRef.current.audio, info.freq, 'pluck', 0.9, info.id, pan);
    }
  }, []);
  useClickPluck(sceneRef, worldRef, onPluck);

  // desbloqueio de áudio no primeiro gesto
  useEffect(() => {
    const unlock = () => AudioEngine.ensure();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // ----- luz falsa + parallax + cursor da mão + sustain por proximidade -----
  const onFrame = useCallback((pointer) => {
    // "tigela cantante": ticks por proximidade (contato físico contínuo não
    // acontece — o corpo do ponteiro empurra a peça pra longe)
    const world = worldRef.current;
    if (world && pointer.active) {
      for (const strand of world.strands) {
        for (const piece of strand.elements) {
          const b = piece.body;
          const dx = b.position.x - pointer.x;
          const dy = b.position.y - pointer.y;
          if (Math.hypot(dx, dy) < 34 + piece.h * 0.3) {
            const info = b.plugin.chime;
            const pan = (strand.anchor.x / window.innerWidth) * 2 - 1;
            AudioEngine.sustainTick(materialRef.current.audio, info.freq, info.id, pan);
          }
        }
      }
    }

    const el = sceneRef.current;
    if (el && pointer.active) {
      el.style.setProperty('--light-x', `${pointer.x}px`);
      el.style.setProperty('--light-y', `${pointer.y}px`);
      el.style.setProperty('--par-x', `${(pointer.x / window.innerWidth - 0.5) * 14}px`);
      el.style.setProperty('--par-y', `${(pointer.y / window.innerHeight - 0.5) * 8}px`);
    }
    const cursor = handCursorRef.current;
    if (cursor) {
      const show = pointer.source === 'hand' && pointer.handPresent;
      cursor.style.opacity = show ? '1' : '0';
      if (show) {
        cursor.style.transform = `translate(${pointer.x}px, ${pointer.y}px)`;
      }
    }
  }, []);

  usePhysicsLoop(worldRef, pointerRef, cordRefs, onFrame);

  const geo = canopyGeometry(w, h);

  return (
    <div className="chime-scene" ref={sceneRef}>
      <BackgroundLayer />
      <HeroText />
      <ParticleLayer isNight={isNight} />
      <HangingSystem width={w} height={h} strands={strands} cordRefs={cordRefs} />
      <RoofCanopy width={w} height={h} geo={geo} tubes={tubes} />
      <div
        ref={handCursorRef}
        className="hand-cursor"
        style={{ '--cursor-color': material.cursorColor }}
        aria-hidden="true"
      />
    </div>
  );
}
