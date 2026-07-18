import { useState } from 'react';

const KEY = 'tilim-mobile-notice';

/** Aviso discreto e dispensável em telas pequenas. */
export function MobileNotice() {
  const [visible, setVisible] = useState(
    () => window.innerWidth < 900 && !localStorage.getItem(KEY)
  );
  if (!visible) return null;
  return (
    <div className="mobile-notice" data-ui="true" role="note">
      <span>
        No computador a experiência fica completa — arrastar a cortina,
        câmera e notas lado a lado.
      </span>
      <button
        type="button"
        aria-label="Fechar aviso"
        onClick={() => {
          localStorage.setItem(KEY, '1');
          setVisible(false);
        }}
      >
        ×
      </button>
    </div>
  );
}
