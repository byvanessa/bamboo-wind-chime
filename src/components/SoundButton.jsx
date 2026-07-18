import { useState } from 'react';
import { AudioEngine } from '../audio/AudioEngine.js';

/** Botão circular de som — escuro, canto inferior direito. */
export function SoundButton() {
  const [muted, setMuted] = useState(false);

  const toggle = () => {
    AudioEngine.ensure();
    const next = !muted;
    setMuted(next);
    AudioEngine.setMuted(next);
  };

  return (
    <button
      type="button"
      className="sound-btn"
      data-ui="true"
      onClick={toggle}
      aria-label={muted ? 'Ativar som' : 'Silenciar'}
      title={muted ? 'Ativar som' : 'Silenciar'}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4z" />
        {muted ? (
          <path
            d="M16 8.5l5 7M21 8.5l-5 7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
        ) : (
          <>
            <path
              d="M15.5 9.2a3.6 3.6 0 0 1 0 5.6"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M17.8 7a7 7 0 0 1 0 10"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              fill="none"
            />
          </>
        )}
      </svg>
    </button>
  );
}
