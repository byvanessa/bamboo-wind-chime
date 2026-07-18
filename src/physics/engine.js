/**
 * Motor de física headless — Matter.js é o cérebro: calcula pêndulo,
 * gravidade, colisão e resposta a forças. Nunca toca o DOM.
 *
 * Dois tipos de estrutura pendurada:
 *  - bambu: um tubo rígido por corda (pêndulo simples)
 *  - vidro: corrente de caquinhos pequenos interligados por constraints
 *    (cada fio não colide consigo mesmo; fios vizinhos tilintam entre si)
 */
import Matter from 'matter-js';
import { TUBES, tubeLengthFor, tubeRadiusFor } from '../config/tubes.config.js';

const { Engine, World, Bodies, Body, Constraint, Events } = Matter;

/**
 * Geometria do telhado a partir do viewport.
 * Em telas largas a cortina vive na metade esquerda (o quadro de post-its
 * ocupa a direita); no mobile volta pro centro.
 */
export function canopyGeometry(w, h) {
  const narrow = w < 900;
  // um pouco mais da metade da tela em desktop
  const roofW = narrow
    ? Math.min(w * 0.94, 620)
    : Math.min(880, Math.max(500, w * 0.54));
  const cx = narrow ? w / 2 : Math.max(roofW / 2 + 20, w * 0.3);
  // os adornos (cúpula + galo) não crescem além de 1.15×
  const os = Math.min(roofW / 560, 1.15);
  // cumeeira abaixo do menu, com folga pros adornos — o telhado tem o
  // espaço dele; só as peças em movimento podem invadir
  const menuH = narrow ? 50 : 58;
  const ridgeY = menuH + 92 * os + 8;
  const roofH = roofW * 0.22; // telhado de quatro águas visto de frente
  const eaveY = ridgeY + roofH;
  const beamY = eaveY + 18; // viga abaixo do beiral
  const innerHalf = roofW * 0.42;
  const scale = Math.max(0.6, Math.min(1, Math.min(roofW / 620, h / 820)));
  return { cx, ridgeY, roofH, eaveY, beamY, roofW, innerHalf, scale };
}

export function createChimeWorld(w, h, materialType, materialPhysics, tubes = TUBES) {
  const geo = canopyGeometry(w, h);
  const engine = Engine.create();
  engine.gravity.y = 1;
  engine.positionIterations = 10;
  engine.velocityIterations = 8;
  engine.constraintIterations = 4;

  const allBodies = [];
  const allConstraints = [];

  const strands = tubes.map((tube, i) => {
    const anchorX = geo.cx + tube.t * 2 * geo.innerHalf;
    const anchorY = geo.beamY + 4;
    const totalLen = tubeLengthFor(tube.freq) * geo.scale * 0.66;
    const cordLen = (72 + (i % 3) * 20) * geo.scale;

    const elements = [];

    if (materialType === 'bamboo') {
      const radius = tubeRadiusFor(tube.freq) * geo.scale;
      const body = Bodies.rectangle(
        anchorX,
        anchorY + cordLen + totalLen / 2,
        radius * 2,
        totalLen,
        {
          restitution: materialPhysics.restitution,
          frictionAir: materialPhysics.frictionAir,
          density: materialPhysics.density,
          friction: 0.05,
          chamfer: { radius: Math.min(6, radius * 0.5) },
          label: `tube-${tube.id}`,
        }
      );
      body.plugin.chime = {
        kind: 'piece',
        id: tube.id,
        strand: i,
        seg: 0,
        freq: tube.freq,
      };
      allBodies.push(body);
      allConstraints.push(
        Constraint.create({
          pointA: { x: anchorX, y: anchorY },
          bodyB: body,
          pointB: { x: 0, y: -totalLen / 2 },
          length: cordLen,
          stiffness: 0.95,
          damping: 0.03,
        })
      );
      elements.push({ key: `b-${tube.id}`, body, w: radius * 2, h: totalLen, seg: 0 });
    } else {
      // corrente de miçangas: fio não colide consigo mesmo (grupo negativo).
      // Contas bem pequenas — efeito de cortina que vai e volta.
      const group = Body.nextGroup(true);
      const segH = 13 * geo.scale;
      const segW = 9 * geo.scale;
      const gap = 3 * geo.scale;
      const chainLen = Math.max(150 * geo.scale, totalLen * 1.05);
      const count = Math.max(9, Math.min(14, Math.round(chainLen / (segH + gap))));
      let prev = null;
      let yCursor = anchorY + cordLen;

      for (let k = 0; k < count; k++) {
        const body = Bodies.rectangle(anchorX, yCursor + segH / 2, segW, segH, {
          restitution: materialPhysics.restitution,
          frictionAir: materialPhysics.frictionAir,
          density: materialPhysics.density,
          friction: 0.02,
          chamfer: { radius: 4 * geo.scale },
          collisionFilter: { group },
          label: `shard-${tube.id}-${k}`,
        });
        // caquinhos mais abaixo no fio soam mais agudos (menores na percepção)
        body.plugin.chime = {
          kind: 'piece',
          id: `${tube.id}-${k}`,
          strand: i,
          seg: k,
          freq: tube.freq * Math.pow(1.059, k), // sobe ~1 semitom por elo
        };
        allBodies.push(body);
        allConstraints.push(
          prev
            ? Constraint.create({
                bodyA: prev,
                pointA: { x: 0, y: segH / 2 },
                bodyB: body,
                pointB: { x: 0, y: -segH / 2 },
                length: gap,
                stiffness: 0.95,
                damping: 0.04,
              })
            : Constraint.create({
                pointA: { x: anchorX, y: anchorY },
                bodyB: body,
                pointB: { x: 0, y: -segH / 2 },
                length: cordLen,
                stiffness: 0.95,
                damping: 0.03,
              })
        );
        elements.push({ key: `g-${tube.id}-${k}`, body, w: segW, h: segH, seg: k });
        prev = body;
        yCursor += segH + gap;
      }
    }

    return {
      id: tube.id,
      index: i,
      freq: tube.freq,
      anchor: { x: anchorX, y: anchorY },
      cordLen,
      type: materialType === 'bamboo' ? 'tube' : 'chain',
      elements,
    };
  });

  const pointerBody = Bodies.circle(-1000, -1000, 16 * geo.scale + 6, {
    isStatic: true,
    restitution: 0.1,
    label: 'pointer',
  });
  pointerBody.plugin.chime = { kind: 'pointer' };

  World.add(engine.world, [...allBodies, ...allConstraints, pointerBody]);

  return { engine, strands, pointerBody, geo, gust: null };
}

/**
 * Agenda uma rajada automática no mundo: força suave com ataque lento
 * (envelope senoidal), aplicada a um subconjunto de fios pelo loop de
 * física — a física não distingue rajada de gesto do usuário.
 */
export function startGust(world, { strength = 1 } = {}) {
  const n = world.strands.length;
  const howMany = Math.max(2, Math.round(n * (0.3 + Math.random() * 0.35)));
  const picked = new Set();
  while (picked.size < howMany) picked.add(Math.floor(Math.random() * n));
  world.gust = {
    start: performance.now(),
    dur: 2600 + Math.random() * 2200,
    dir: Math.random() > 0.5 ? 1 : -1,
    strength,
    strands: picked,
  };
}

/** Vento ambiente: soma de senoides lentas + rajadas ocasionais. */
export function ambientWind(tSec) {
  const slow =
    Math.sin(tSec * 0.31) * 0.45 +
    Math.sin(tSec * 0.13 + 1.7) * 0.35 +
    Math.sin(tSec * 0.53 + 4.1) * 0.2;
  const gust = Math.max(0, Math.sin(tSec * 0.045 + 2.0)) ** 3;
  return slow * (0.35 + gust * 1.1);
}

/** Aplica forças do frame: vento ambiente + brisa do ponteiro. */
export function applyFrameForces(world, tSec, pointer) {
  const wind = ambientWind(tSec);

  // rajada automática ativa? (envelope suave, mais lenta que o hover)
  let gustForce = 0;
  if (world.gust) {
    const progress = (performance.now() - world.gust.start) / world.gust.dur;
    if (progress >= 1) {
      world.gust = null;
    } else {
      const env = Math.sin(Math.PI * progress) ** 2; // ataque e saída lentos
      gustForce = world.gust.dir * env * 0.00024 * world.gust.strength;
    }
  }

  for (const strand of world.strands) {
    const inGust = world.gust && world.gust.strands.has(strand.index);
    for (const el of strand.elements) {
      const b = el.body;
      const phase = 1 + 0.25 * Math.sin(tSec * 0.9 + strand.index * 1.3 + el.seg * 0.4);
      Body.applyForce(b, b.position, {
        x: (wind * phase * 0.00002 + (inGust ? gustForce : 0)) * b.mass,
        y: 0,
      });

      if (pointer && pointer.active) {
        const dx = b.position.x - pointer.x;
        const dy = b.position.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        const influence = 150;
        if (dist < influence && dist > 1) {
          const speed = Math.hypot(pointer.vx, pointer.vy);
          if (speed > 0.5) {
            // brisa: aceleração máxima ~0.9× a gravidade do Matter
            const falloff = 1 - dist / influence;
            const clamp = (v) => Math.max(-40, Math.min(40, v));
            const k = 0.000022 * falloff * b.mass;
            Body.applyForce(b, b.position, {
              x: clamp(pointer.vx) * k,
              y: clamp(pointer.vy) * k * 0.35,
            });
          }
        }
      }
    }
  }
}

/**
 * Colisões → som:
 *  - peça ↔ peça → knock (intensidade pela velocidade relativa)
 *  - ponteiro ↔ peça → touch/hover
 */
export function bindCollisionSounds(world, { onKnock, onTouch, onTouchActive }) {
  const handler = (event) => {
    for (const pair of event.pairs) {
      const a = pair.bodyA.plugin.chime;
      const b = pair.bodyB.plugin.chime;
      if (!a || !b) continue;

      if (a.kind === 'piece' && b.kind === 'piece') {
        const va = pair.bodyA.velocity;
        const vb = pair.bodyB.velocity;
        const rel = Math.hypot(va.x - vb.x, va.y - vb.y);
        if (rel > 0.3) onKnock(a, b, Math.min(1, rel / 6));
      } else if (
        (a.kind === 'pointer' && b.kind === 'piece') ||
        (b.kind === 'pointer' && a.kind === 'piece')
      ) {
        const piece = a.kind === 'piece' ? a : b;
        onTouch(piece);
      }
    }
  };
  Events.on(world.engine, 'collisionStart', handler);

  // contato contínuo ponteiro↔peça (hover prolongado → "tigela cantante")
  let activeHandler = null;
  if (onTouchActive) {
    activeHandler = (event) => {
      for (const pair of event.pairs) {
        const a = pair.bodyA.plugin.chime;
        const b = pair.bodyB.plugin.chime;
        if (!a || !b) continue;
        if (
          (a.kind === 'pointer' && b.kind === 'piece') ||
          (b.kind === 'pointer' && a.kind === 'piece')
        ) {
          onTouchActive(a.kind === 'piece' ? a : b);
        }
      }
    };
    Events.on(world.engine, 'collisionActive', activeHandler);
  }

  return () => {
    Events.off(world.engine, 'collisionStart', handler);
    if (activeHandler) Events.off(world.engine, 'collisionActive', activeHandler);
  };
}

/** Pluck: impulso lateral no elemento mais próximo do clique. */
export function pluckAt(world, x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const strand of world.strands) {
    for (const el of strand.elements) {
      const b = el.body;
      const d = Math.hypot(x - b.position.x, (y - b.position.y) * 0.6);
      if (d < bestDist) {
        bestDist = d;
        best = { strand, el };
      }
    }
  }
  if (!best || bestDist > Math.max(80, best.el.h * 0.8)) return null;

  const b = best.el.body;
  const dir = x < b.position.x ? 1 : -1;
  const strength = b.mass * (best.strand.type === 'chain' ? 0.055 : 0.038);
  Body.applyForce(
    b,
    { x: b.position.x, y: b.position.y - best.el.h * 0.2 },
    { x: dir * strength, y: -strength * 0.12 }
  );
  return best;
}

// ---------- puxar a cortina (arrastar um fio e soltar) ----------

/** Agarra o elemento mais próximo do ponto; devolve true se pegou. */
export function grabAt(world, x, y) {
  releaseGrab(world);
  let best = null;
  let bestDist = Infinity;
  for (const strand of world.strands) {
    for (const el of strand.elements) {
      const d = Math.hypot(x - el.body.position.x, y - el.body.position.y);
      if (d < bestDist) {
        bestDist = d;
        best = el;
      }
    }
  }
  if (!best || bestDist > 52) return false;
  const constraint = Constraint.create({
    pointA: { x, y },
    bodyB: best.body,
    pointB: { x: 0, y: 0 },
    length: 2,
    stiffness: 0.055, // mola macia: puxa, e ao soltar volta balançando
    damping: 0.06,
  });
  World.add(world.engine.world, constraint);
  world.grab = { constraint };
  return true;
}

/** Segue o ponteiro enquanto o fio está agarrado. */
export function moveGrab(world, x, y) {
  if (world.grab) {
    world.grab.constraint.pointA.x = x;
    world.grab.constraint.pointA.y = y;
  }
}

export function releaseGrab(world) {
  if (world.grab) {
    Matter.Composite.remove(world.engine.world, world.grab.constraint);
    world.grab = null;
  }
}

export function destroyWorld(world) {
  Events.off(world.engine);
  World.clear(world.engine.world, false);
  Engine.clear(world.engine);
}
