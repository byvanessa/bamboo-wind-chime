import { useEffect, useRef } from 'react';
import { writePointer } from './InputManager.js';

const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

/**
 * Rastreamento de mão via MediaPipe HandLandmarker.
 * Controlado manualmente pelo CameraToggle: liga/desliga a qualquer momento.
 * A ponta do indicador (landmark 8) vira o ponteiro, com espelhamento
 * (a webcam é um espelho) e suavização EMA.
 */
export function useHandTrackingInput(pointerRef, enabled, setStatus) {
  const sessionRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    const session = { stream: null, video: null, landmarker: null, raf: 0 };
    sessionRef.current = session;

    async function start() {
      setStatus('loading');
      try {
        session.stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false,
        });
      } catch (err) {
        if (!cancelled) {
          setStatus(err && err.name === 'NotAllowedError' ? 'denied' : 'error');
        }
        return;
      }
      if (cancelled) {
        session.stream.getTracks().forEach((t) => t.stop());
        return;
      }

      try {
        const { FilesetResolver, HandLandmarker } = await import(
          '@mediapipe/tasks-vision'
        );
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        session.landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numHands: 1,
        });
      } catch (err) {
        if (!cancelled) setStatus('error');
        session.stream.getTracks().forEach((t) => t.stop());
        return;
      }
      if (cancelled) {
        session.stream.getTracks().forEach((t) => t.stop());
        session.landmarker?.close();
        return;
      }

      const video = document.createElement('video');
      video.playsInline = true;
      video.muted = true;
      video.srcObject = session.stream;
      session.video = video;
      await video.play().catch(() => {});
      if (cancelled) return;

      setStatus('active');

      // EMA — suaviza tremor natural da mão
      let ex = null;
      let ey = null;
      const ALPHA = 0.35;
      let lastVideoTime = -1;
      let missFrames = 0;

      // histórico do X da palma p/ detectar "tchau" (oscilação rápida)
      const waveBuf = [];

      // dedos estendidos: ponta mais longe do pulso que a articulação média
      const countExtended = (lm) => {
        const wrist = lm[0];
        const d = (a) => Math.hypot(a.x - wrist.x, a.y - wrist.y);
        let n = 0;
        for (const [tip, pip] of [[8, 6], [12, 10], [16, 14], [20, 18]]) {
          if (d(lm[tip]) > d(lm[pip]) * 1.12) n++;
        }
        return n;
      };

      const loop = () => {
        if (cancelled) return;
        session.raf = requestAnimationFrame(loop);
        if (!session.landmarker || video.readyState < 2) return;
        if (video.currentTime === lastVideoTime) return;
        lastVideoTime = video.currentTime;

        let result;
        try {
          result = session.landmarker.detectForVideo(video, performance.now());
        } catch {
          return;
        }
        const p = pointerRef.current;
        const lm = result.landmarks && result.landmarks[0];
        if (lm && lm[8]) {
          missFrames = 0;
          // espelha X (webcam = espelho) e mapeia pro viewport
          const nx = (1 - lm[8].x) * window.innerWidth;
          const ny = lm[8].y * window.innerHeight;
          ex = ex == null ? nx : ex + ALPHA * (nx - ex);
          ey = ey == null ? ny : ey + ALPHA * (ny - ey);
          p.handPresent = true;
          writePointer(p, ex, ey, 'hand', performance.now());

          // pose da mão (aberta move post-it, fechada solta)
          const ext = countExtended(lm);
          p.handPose = ext >= 3 ? 'open' : ext <= 1 ? 'fist' : 'half';

          // "tchau": mão aberta oscilando rápido na horizontal
          const now = performance.now();
          waveBuf.push({ x: lm[9].x, t: now });
          while (waveBuf.length && now - waveBuf[0].t > 900) waveBuf.shift();
          if (p.handPose === 'open' && waveBuf.length > 6) {
            let flips = 0;
            let lastDir = 0;
            for (let i = 1; i < waveBuf.length; i++) {
              const dx = waveBuf[i].x - waveBuf[i - 1].x;
              if (Math.abs(dx) < 0.012) continue;
              const dir = Math.sign(dx);
              if (lastDir && dir !== lastDir) flips++;
              lastDir = dir;
            }
            if (flips >= 3) {
              p.waveAt = now;
              waveBuf.length = 0;
            }
          }
        } else {
          missFrames++;
          if (missFrames > 12 && p.handPresent) {
            // mão sumiu — devolve o comando ao mouse
            p.handPresent = false;
            p.handPose = 'none';
            if (p.source === 'hand') {
              p.active = false;
              p.vx = 0;
              p.vy = 0;
            }
            ex = null;
            ey = null;
          }
        }
      };
      session.raf = requestAnimationFrame(loop);
    }

    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(session.raf);
      session.stream?.getTracks().forEach((t) => t.stop());
      session.landmarker?.close();
      if (session.video) session.video.srcObject = null;
      const p = pointerRef.current;
      p.handPresent = false;
      if (p.source === 'hand') {
        p.active = false;
        p.source = 'mouse';
      }
      setStatus('idle');
    };
  }, [enabled, pointerRef, setStatus]);
}
