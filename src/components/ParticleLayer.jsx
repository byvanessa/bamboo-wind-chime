import { useEffect, useRef } from 'react';

/**
 * Partículas de atmosfera — canvas 2D leve, sem interação com a física.
 * Dia: folhas caindo devagar. Noite: vagalumes com brilho pulsante.
 * Densidade baixa de propósito: é ambiente, não protagonista.
 */
const COUNT = 8;

function makeParticle(night, w, h, spawnAnywhere) {
  if (night) {
    return {
      x: Math.random() * w,
      y: h * 0.25 + Math.random() * h * 0.7,
      vx: (Math.random() - 0.5) * 0.16,
      vy: (Math.random() - 0.5) * 0.1,
      phase: Math.random() * Math.PI * 2,
      pulse: 0.5 + Math.random() * 0.7, // velocidade do pulso
      size: 1.6 + Math.random() * 1.4,
      drift: Math.random() * Math.PI * 2,
    };
  }
  return {
    x: Math.random() * w,
    y: spawnAnywhere ? Math.random() * h : -20 - Math.random() * 60,
    vy: 0.14 + Math.random() * 0.22,
    sway: 0.4 + Math.random() * 0.8,
    swayPhase: Math.random() * Math.PI * 2,
    rot: Math.random() * Math.PI * 2,
    rotV: (Math.random() - 0.5) * 0.01,
    size: 4 + Math.random() * 4,
    tone: Math.random(),
  };
}

export function ParticleLayer({ isNight }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let w = window.innerWidth;
    let h = window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    let particles = Array.from({ length: COUNT }, () =>
      makeParticle(isNight, w, h, true)
    );

    let raf;
    let t = 0;
    const step = () => {
      raf = requestAnimationFrame(step);
      if (document.hidden) return; // economiza bateria em segundo plano
      t += 0.016;
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (isNight) {
          // vagalume: deriva lenta + brilho oscilando
          p.drift += (Math.random() - 0.5) * 0.05;
          p.x += p.vx + Math.cos(p.drift) * 0.12;
          p.y += p.vy + Math.sin(p.drift) * 0.08;
          if (p.x < -20 || p.x > w + 20 || p.y < h * 0.12 || p.y > h + 20) {
            particles[i] = makeParticle(true, w, h, false);
            continue;
          }
          const glow = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * p.pulse + p.phase));
          const r = p.size;
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 5);
          grad.addColorStop(0, `rgba(226, 255, 170, ${0.5 * glow})`);
          grad.addColorStop(0.35, `rgba(206, 235, 140, ${0.16 * glow})`);
          grad.addColorStop(1, 'rgba(206, 235, 140, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(240, 255, 200, ${0.65 * glow})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 0.8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // folha: queda lenta com balanço e rotação
          p.swayPhase += 0.012 * p.sway;
          p.x += Math.sin(p.swayPhase) * 0.5;
          p.y += p.vy;
          p.rot += p.rotV;
          if (p.y > h + 30) {
            particles[i] = makeParticle(false, w, h, false);
            continue;
          }
          const alpha = 0.22 + p.tone * 0.12;
          const hue = 34 + p.tone * 26; // ocre → oliva
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot + Math.sin(p.swayPhase) * 0.4);
          ctx.fillStyle = `hsla(${hue}, 45%, 42%, ${alpha})`;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    };
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      ctx.clearRect(0, 0, w, h);
    };
  }, [isNight]);

  return <canvas ref={canvasRef} className="particle-layer" aria-hidden="true" />;
}
