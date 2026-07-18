/**
 * Geometria das peças penduradas — independente do material.
 * `t` é a posição normalizada (-0.5..0.5) ao longo da viga onde a corda
 * ancora. `freq` é a fundamental (Hz); o comprimento visual deriva dela
 * (peça mais longa = nota mais grave), como num carrilhão real.
 */

// escala pentatônica de Lá menor gerada por intervalos (0,3,5,7,10 semitons),
// estendida por quantas oitavas a cortina precisar — sempre consonante
const PENTA_STEPS = [0, 3, 5, 7, 10];
function pentatonic(n) {
  return Array.from({ length: n }, (_, i) => {
    const oct = Math.floor(i / 5);
    const st = PENTA_STEPS[i % 5] + oct * 12;
    return 220 * Math.pow(2, st / 12);
  });
}

/** Gera `count` fios distribuídos uniformemente ao longo da viga. */
export function generateTubes(count) {
  const n = Math.max(2, Math.min(count, 40));
  const freqs = pentatonic(n);
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    t: -0.5 + i / (n - 1),
    freq: freqs[i],
  }));
}

export const DEFAULT_TUBE_COUNT = 20;
export const TUBES = generateTubes(DEFAULT_TUBE_COUNT);

/** Comprimento do tubo (px, antes da escala da cena) a partir da fundamental. */
export function tubeLengthFor(freq) {
  return Math.max(84, Math.min(260, 260 * Math.pow(220 / freq, 0.55)));
}

/** Meia-largura (raio) do tubo em px. */
export function tubeRadiusFor(freq) {
  return Math.max(7, Math.min(14, 13 * Math.pow(220 / freq, 0.3)));
}
