/**
 * Fundo em camadas independentes:
 *  1. cor sólida via --bg-color (trocada pelo BackgroundColorPicker)
 *  2. textura de ruído (feTurbulence em data-URI) com parallax sutil
 *  3. vinheta
 *  4. "luz falsa" — radial-gradient que segue o ponteiro (--light-x/--light-y)
 * Trocar a cor de fundo não afeta moldura nem textura (camadas separadas).
 */
const NOISE_URI = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0.55 0'/></filter><rect width='240' height='240' filter='url(%23n)'/></svg>`
)}")`;

export function BackgroundLayer() {
  return (
    <div className="bg-root" aria-hidden="true">
      <div className="bg-color" />
      <div className="bg-noise" style={{ backgroundImage: NOISE_URI }} />
      <div className="bg-vignette" />
      <div className="bg-light" />
    </div>
  );
}
