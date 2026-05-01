/**
 * Shared responsive CSS injected at the root of every demo render.
 * Provides global resets, viewport hardening, and aggressive defensive
 * mobile overrides so themes only have to manage their own theme-specific
 * responsive behavior.
 *
 * The `[style*="grid-template-columns"]` override forces all multi-column
 * inline grids onto a single column at <768px. If a specific grid needs
 * to stay multi-column on mobile (e.g. a 2x2 stat row), the consumer
 * should opt-out by giving its wrapper the `.demo-keep-grid` class.
 */
export default function ResponsiveBase() {
  return (
    <style>{`
      *, *::before, *::after { box-sizing: border-box; }
      img, svg, video { max-width: 100%; }
      body { overflow-x: hidden; }
      html, body { -webkit-text-size-adjust: 100%; }

      button, a[role='button'], .demo-touch-target {
        min-height: 44px;
      }
      input, textarea, select {
        font-size: 16px;
      }

      .demo-mobile-only { display: none; }
      .demo-desktop-only { display: initial; }

      .demo-table-scroll {
        width: 100%;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      @media (max-width: 767px) {
        .demo-mobile-only { display: initial; }
        .demo-desktop-only { display: none !important; }

        /* Defensive collapse: any element with an inline grid template
           collapses to single column unless explicitly opted-out. */
        [style*="grid-template-columns"]:not(.demo-keep-grid) {
          grid-template-columns: 1fr !important;
        }

        /* 2x2 grid utility for stat strips */
        .demo-stat-2x2 {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
      }
    `}</style>
  )
}
