// ============================================================================
// Lead Intelligence API  —  POST /api/places { action, ... }
//
// Formerly an unauthenticated Google Places proxy. It is now the secured
// Lead Intelligence Engine endpoint (discovery, enrichment, website analysis,
// scoring, pricing, add-to-leads, call logging, history, dashboard, settings).
// All logic lives in api/_intel-*.js (underscore files are not counted as
// Vercel functions).
//
// Env vars:
//   VITE_DATABASE_URL      Neon Postgres (required)
//   GOOGLE_PLACES_API_KEY  Google Places key, server-side only (falls back to
//                          VITE_GOOGLE_PLACES_KEY for existing projects)
//   APP_SECRET             HMAC secret for admin session tokens
// ============================================================================

import { intelHandler } from './_intel-handler.js'

// Max duration (60s) is set for this function in vercel.json.

export default function handler(req, res) {
  return intelHandler(req, res)
}
