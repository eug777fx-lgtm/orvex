// Centralized design tokens for the Lithos Labs monochrome theme.
// Import these whenever you need consistent colors / typography / spacing.

export const COLORS = {
  // Backgrounds
  BG_PRIMARY: '#000000',
  BG_SECONDARY: '#0A0A0A',
  BG_CARD: '#111111',
  BG_ELEVATED: '#1A1A1A',
  BG_HOVER: '#222222',
  BG_SELECTED: '#2A2A2A',
  BG_INPUT: '#141414',

  // Borders
  BORDER_PRIMARY: '#2A2A2A',
  BORDER_SECONDARY: '#333333',
  BORDER_FOCUS: '#FFFFFF',
  BORDER_SUBTLE: '#1A1A1A',

  // Text
  TEXT_PRIMARY: '#FFFFFF',
  TEXT_SECONDARY: '#A0A0A0',
  TEXT_TERTIARY: '#666666',
  TEXT_PLACEHOLDER: '#555555',
  TEXT_INVERTED: '#000000',

  // Accent (minimal — only for primary actions)
  ACCENT_PRIMARY: '#FFFFFF',
  ACCENT_HOVER: '#E0E0E0',
  ACCENT_MUTED: '#333333',

  // Status (kept minimal)
  SUCCESS: '#FFFFFF',
  SUCCESS_BG: '#1A1A1A',
  ERROR: '#FF4444',
  ERROR_BG: '#1A0000',
  WARNING: '#AAAAAA',
  WARNING_BG: '#1A1A00',

  // Data visualisation (grayscale)
  CHART_1: '#FFFFFF',
  CHART_2: '#AAAAAA',
  CHART_3: '#666666',
  CHART_4: '#333333',
  CHART_5: '#1A1A1A',

  // Special
  OVERLAY: 'rgba(0, 0, 0, 0.8)',
  SHADOW: '0 4px 24px rgba(0, 0, 0, 0.8)',
  SHADOW_SM: '0 2px 8px rgba(0, 0, 0, 0.6)',
}

export const TYPOGRAPHY = {
  FONT_PRIMARY: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  FONT_MONO: "'JetBrains Mono', 'Fira Code', monospace",
  SIZE_XS: '11px',
  SIZE_SM: '13px',
  SIZE_BASE: '14px',
  SIZE_MD: '15px',
  SIZE_LG: '18px',
  SIZE_XL: '24px',
  SIZE_2XL: '32px',
  SIZE_3XL: '48px',
  WEIGHT_NORMAL: '400',
  WEIGHT_MEDIUM: '500',
  WEIGHT_SEMIBOLD: '600',
  WEIGHT_BOLD: '700',
}

export const RADIUS = {
  SM: '6px',
  MD: '8px',
  LG: '12px',
  XL: '16px',
  FULL: '9999px',
}

export const SPACING = {
  XS: '4px',
  SM: '8px',
  MD: '12px',
  LG: '16px',
  XL: '24px',
  XXL: '32px',
  XXXL: '48px',
}

export const STYLES = {
  card: {
    background: '#111111',
    border: '1px solid #2A2A2A',
    borderRadius: '12px',
    padding: '24px',
  },
  cardElevated: {
    background: '#1A1A1A',
    border: '1px solid #333333',
    borderRadius: '12px',
    padding: '24px',
  },
  input: {
    background: '#141414',
    border: '1px solid #2A2A2A',
    borderRadius: '8px',
    color: '#FFFFFF',
    padding: '10px 14px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.15s ease',
  },
  button: {
    primary: {
      background: '#FFFFFF',
      color: '#000000',
      border: 'none',
      borderRadius: '8px',
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
    secondary: {
      background: 'transparent',
      color: '#FFFFFF',
      border: '1px solid #2A2A2A',
      borderRadius: '8px',
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
    ghost: {
      background: 'transparent',
      color: '#A0A0A0',
      border: 'none',
      borderRadius: '8px',
      padding: '8px 16px',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
  },
  modal: {
    background: '#111111',
    border: '1px solid #2A2A2A',
    borderRadius: '16px',
    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.9)',
  },
  sidebar: {
    background: '#000000',
    borderRight: '1px solid #1A1A1A',
  },
  header: {
    background: '#000000',
    borderBottom: '1px solid #1A1A1A',
  },
  badge: {
    background: '#1A1A1A',
    color: '#FFFFFF',
    border: '1px solid #2A2A2A',
    borderRadius: '6px',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: '500',
  },
  stat: {
    background: '#111111',
    border: '1px solid #2A2A2A',
    borderRadius: '12px',
    padding: '20px',
  },
  tableHeader: {
    background: '#0A0A0A',
    color: '#666666',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding: '12px 16px',
    borderBottom: '1px solid #1A1A1A',
  },
  tableRow: {
    borderBottom: '1px solid #1A1A1A',
    padding: '14px 16px',
    color: '#FFFFFF',
    fontSize: '14px',
    transition: 'background 0.1s ease',
  },
}
