// Eclipse theme metadata.
// The Eclipse renderers themselves live inline inside src/pages/PublicDemo.jsx
// as TEMPLATE_RENDERERS to avoid circular imports. This file documents the theme
// and exposes its design tokens for any future shared components.

export const ECLIPSE_META = {
  key: 'eclipse',
  name: 'Eclipse',
  vibe: 'Dark Glass',
  description: 'Clean monochrome glassmorphism',
}

export const ECLIPSE_TOKENS = {
  bg: '#08080a',
  surface: 'rgba(17,17,20,0.7)',
  border: 'rgba(255,255,255,0.1)',
  text: '#ffffff',
  textMuted: 'rgba(255,255,255,0.5)',
  accent: 'rgba(99,120,255,0.85)',
}

export default ECLIPSE_META
