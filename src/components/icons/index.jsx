/**
 * Conjunto único de ícones do ControlPanel — mesmas regras para todos:
 * viewBox 24, outline (sem preenchimento), stroke 1.6, cantos redondos,
 * cor via currentColor (o botão decide a cor pelo estado ativo/inativo).
 */
function Icon({ children, size = 18, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const BambooIcon = (p) => (
  <Icon {...p}>
    <rect x="9" y="3" width="6" height="18" rx="3" />
    <path d="M9 9.5h6M9 15h6" />
  </Icon>
);

export const GlassIcon = (p) => (
  <Icon {...p}>
    <path d="M12 3l6 5.5-4 12h-4l-4-12L12 3z" />
    <path d="M12 3l-1 8 3 3" strokeWidth="1.1" opacity="0.7" />
  </Icon>
);

export const CameraIcon = (p) => (
  <Icon {...p}>
    <rect x="3" y="7" width="13" height="10" rx="2.5" />
    <path d="M16 10.5l5-2.5v8l-5-2.5" />
  </Icon>
);

export const PaletteIcon = (p) => (
  <Icon {...p}>
    <path d="M12 3a9 9 0 1 0 0 18c1.6 0 2.2-1 1.6-2.2-.7-1.4.2-2.8 1.8-2.8H17a4 4 0 0 0 4-4c0-5-4-9-9-9z" />
    <circle cx="8" cy="10" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="12" cy="7.5" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="16" cy="10" r="0.9" fill="currentColor" stroke="none" />
  </Icon>
);

export const DensityIcon = (p) => (
  <Icon {...p}>
    <path d="M6 10v8M12 6v12M18 3v15" />
  </Icon>
);

export const SunIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5 5l1.8 1.8M17.2 17.2L19 19M19 5l-1.8 1.8M6.8 17.2L5 19" />
  </Icon>
);

export const MoonIcon = (p) => (
  <Icon {...p}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" />
  </Icon>
);

export const AutoCycleIcon = (p) => (
  <Icon {...p}>
    <path d="M12 3a9 9 0 0 1 0 18" />
    <path d="M12 3a9 9 0 0 0 0 18" strokeDasharray="2.4 2.6" />
    <path d="M12 8v4l2.6 1.6" />
  </Icon>
);

export const NotesIcon = (p) => (
  <Icon {...p}>
    <path d="M9 18V6l10-2v11.5" />
    <circle cx="6.6" cy="18" r="2.4" />
    <circle cx="16.6" cy="15.5" r="2.4" />
  </Icon>
);

export const WavesIcon = (p) => (
  <Icon {...p}>
    <path d="M3 9c2 -1.8 4 -1.8 6 0s4 1.8 6 0 4 -1.8 6 0" />
    <path d="M3 15c2 -1.8 4 -1.8 6 0s4 1.8 6 0 4 -1.8 6 0" />
  </Icon>
);

export const TimerIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M12 10v4l2.6 1.6M10 2.5h4" />
  </Icon>
);

export const WindIcon = (p) => (
  <Icon {...p}>
    <path d="M3 8h11a2.6 2.6 0 1 0-2.6-2.6M3 12.5h15.5a2.6 2.6 0 1 1-2.6 2.6M3 17h8a2.3 2.3 0 1 1-2.3 2.3" />
  </Icon>
);

export const RainIcon = (p) => (
  <Icon {...p}>
    <path d="M7 13a5 5 0 1 1 1-9.9A6 6 0 0 1 19.5 6 4 4 0 0 1 18 13H7z" />
    <path d="M8.5 16.5l-1 3M13 16.5l-1 3M17.5 16.5l-1 3" />
  </Icon>
);

export const ForestIcon = (p) => (
  <Icon {...p}>
    <path d="M8 3.5L3.5 11h2L3 16.5h10L10.5 11h2L8 3.5z" />
    <path d="M16.5 8l-3 5.5h1.6L13 18.5h8L19 13.5h1.6L17.5 8" strokeWidth="1.4" />
    <path d="M8 16.5v4M17 18.5v2.5" />
  </Icon>
);

export const InfoIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5" />
    <circle cx="12" cy="7.8" r="0.4" fill="currentColor" />
  </Icon>
);

export const SilenceIcon = (p) => (
  <Icon {...p}>
    <path d="M4 9v6h4l5 4V5L8 9H4z" />
    <path d="M16.5 9.5l5 5M21.5 9.5l-5 5" />
  </Icon>
);
