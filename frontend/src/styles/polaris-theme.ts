/**
 * Brand tokens — mirrors the CSS variables in `global.css` `:root`.
 * Source of truth for anything that needs the values in JS/TS (charts,
 * inline styles, canvas rendering) rather than CSS. Keep in sync with
 * `docs/design-specs/design-system.md` §Brand tokens.
 *
 * PrimeReact v10 (Lara Light Indigo) ships static hex, not CSS custom
 * properties, so the brand colours below are bridged into PrimeReact via
 * the `--primary-*` overrides in `styles/global.css` `:root`.
 */
export const polarisBrand = {
  primary: '#3a5fe0',
  primaryHover: '#2c49bd',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  info: '#2563eb',
} as const;

export const polarisStatus = {
  in: polarisBrand.success,
  out: '#cfd4de',
  onLeave: polarisBrand.warning,
  missing: polarisBrand.danger,
  pending: polarisBrand.info,
} as const;

export const polarisSurface = {
  0: '#ffffff',
  50: '#f9fafb',
  100: '#f3f4f6',
  200: '#e5e7eb',
  border: '#d1d5db',
  text: '#111827',
  textMuted: '#6b7280',
} as const;

/** Soft, consistent radius scale — design-system.md §Radius */
export const polarisRadius = {
  sm: 6,
  md: 10,
  lg: 16,
} as const;

/** 4px base spacing scale — design-system.md §Spacing */
export const polarisSpacing = [4, 8, 12, 16, 24, 32] as const;
