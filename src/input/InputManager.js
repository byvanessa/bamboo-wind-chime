/**
 * Estado compartilhado do ponteiro — fonte única lida pela física.
 * Mouse e mão escrevem aqui; a mão tem prioridade quando a câmera está
 * ligada E uma mão está visível; caso contrário o mouse segue como fonte
 * contínua. Cliques (pluck) funcionam sempre, independente do modo.
 */
export function createPointerState() {
  return {
    x: -1000,
    y: -1000,
    vx: 0,
    vy: 0,
    active: false,
    source: 'mouse', // 'mouse' | 'hand' | 'touch'
    handPresent: false,
    handPose: 'none', // 'open' | 'fist' | 'half' | 'none' (só com câmera)
    waveAt: 0, // timestamp do último gesto de "tchau"
    lastMoveAt: 0,
  };
}

/** Estado único do ponteiro — compartilhado entre a cena e os post-its. */
export const pointerState = createPointerState();

/** O mouse só escreve quando a mão não está no comando. */
export function mouseMayWrite(pointer, cameraEnabled) {
  return !(cameraEnabled && pointer.handPresent);
}

export function writePointer(pointer, x, y, source, now) {
  const dt = Math.max(8, now - (pointer.lastMoveAt || now - 16));
  // velocidade em px/frame (~16ms), suavizada
  const nvx = ((x - pointer.x) / dt) * 16;
  const nvy = ((y - pointer.y) / dt) * 16;
  if (pointer.active && pointer.lastMoveAt) {
    pointer.vx = pointer.vx * 0.5 + nvx * 0.5;
    pointer.vy = pointer.vy * 0.5 + nvy * 0.5;
  } else {
    pointer.vx = 0;
    pointer.vy = 0;
  }
  pointer.x = x;
  pointer.y = y;
  pointer.source = source;
  pointer.active = true;
  pointer.lastMoveAt = now;
}
