/**
 * Configuração de material intercambiável (bambu ↔ vidro).
 * Cada peça lê daqui suas propriedades visuais, físicas e sonoras —
 * trocar `materialType` no estado global troca tudo de uma vez,
 * sem tocar em física, input ou estrutura de áudio.
 *
 * O som é sintetizado por modos ressonantes via Web Audio API pura
 * (sem samples externos): `partials` são as razões modais de uma barra
 * do material, `decay` o tempo de cauda — por isso bambu soa seco/curto
 * e vidro soa cristalino/ressonante.
 */
export const MATERIALS = {
  bamboo: {
    label: 'Bambu',
    visualComponent: 'BambooPieceVisual',
    physics: {
      // calibrado p/ cadeia de colisões: um pluck forte propaga knocks
      // decrescentes entre vizinhas e converge em poucos segundos
      restitution: 0.42,
      frictionAir: 0.011,
      density: 0.0035,
    },
    audio: {
      kind: 'wood',
      pitchMul: 1.0,
      partials: [1, 2.76, 5.4, 8.93], // modos transversais de barra livre
      partialGains: [1, 0.42, 0.18, 0.08],
      decay: 0.22, // segundos — batida curta de madeira
      noise: { freqMul: 2.2, q: 1.4, gain: 0.5, decay: 0.035 }, // "toc" do ataque
      reverbSend: 0.18,
      detuneCents: 0,
    },
    cursorColor: 'rgba(214, 178, 120, 0.85)',
  },
  glass: {
    label: 'Vidro',
    visualComponent: 'GlassShardVisual',
    physics: {
      restitution: 0.62, // ricocheteia mais, colisão "viva"
      frictionAir: 0.005, // oscila por mais tempo
      density: 0.0028,
    },
    audio: {
      kind: 'glass',
      pitchMul: 2.4, // caquinhos pequenos → mais agudos
      partials: [1, 2.32, 4.25, 6.63, 9.38],
      partialGains: [1, 0.5, 0.32, 0.18, 0.09],
      decay: 1.3, // cauda cristalina
      noise: { freqMul: 9, q: 3, gain: 0.22, decay: 0.015 }, // "tin" do ataque
      reverbSend: 0.42,
      detuneCents: 4, // par levemente desafinado → brilho/shimmer
    },
    cursorColor: 'rgba(150, 208, 220, 0.85)',
  },
};
