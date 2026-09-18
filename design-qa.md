# Hybrid Landing Design QA

## Evidence

- Source visual truth: `/var/folders/q6/s_326wr156v4fjb0jtc2f04h0000gn/T/TemporaryItems/NSIRD_screencaptureui_3QXV8c/Screenshot 2026-09-18 at 4.42.30 PM.png`
- Focused implementation capture: `/tmp/tripsync-hybrid-map-dark-2048.png`
- Full implementation capture: `frontend/e2e/visual-regression.spec.ts-snapshots/landing-dark-1440-desktop-chrome-darwin.png`
- Mobile implementation capture: `frontend/e2e/visual-regression.spec.ts-snapshots/landing-light-375-desktop-chrome-darwin.png`
- Focused viewport: 2048 × 979 CSS px, device scale factor 1.
- Source pixels: 2812 × 1344. The source was downsampled to 2048 × 979 for the normalized comparison; the implementation was captured natively at 2048 × 979.
- State: dark theme, ASEAN Concept, Philippine corridors, Davao selected.
- Browser evidence: the in-app browser was used to verify the hero, full-width map state, light mobile pilot state, mode/filter interactions, and console output.

## Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: Lexend headings and Source Sans body copy preserve the reference's strong geometric hierarchy while remaining consistent with the existing product. Heading wrapping, labels, card text, and small metadata remain legible at desktop and mobile sizes.
- Spacing and layout rhythm: the desktop map now uses the reference's dominant two-thirds canvas and one-third directory rail. Hero, feature grid, process timeline, network controls, and footer use consistent spacing and do not collide or overflow at 375, 768, 1024, or 1440px.
- Colors and visual tokens: the dark map retains the deep navy, cyan selection, orange hubs, and blue active controls from the source. The light map uses semantic light-theme counterparts. Axe reports no serious or critical contrast violations.
- Image and asset fidelity: the implementation renders the repository's Natural Earth topology as a real data visualization; no raster placeholder, custom illustration, or approximate CSS map replaces the source geography. The supplied TripSync brand mark and existing icon family are retained.
- Copy and content: unsupported live-telemetry, payment, terminal-volume, and accuracy claims were intentionally replaced by clear synthetic-pilot and illustrative-concept language.
- Icons and controls: icon weight is consistent, all major controls have visible labels, and touch targets meet the existing 44px minimum.
- States and interactions: pilot/concept modes, ASEAN filters, marker selection, directory expansion, keyboard activation, booking links, install dispatch, selected-route highlighting, reduced motion, and the map-unavailable fallback were exercised.
- Responsiveness: the directory becomes a horizontal card rail below the map on small screens; the hero CTAs stack without horizontal overflow; the map retains usable controls and labels.

## Comparison History

1. Initial accessibility pass found P1 low-contrast orange accents and an SVG image role containing focusable marker controls. The orange palette was moved to accessible warning/darker action colors, selected surfaces were simplified, and the SVG became a labeled group. Post-fix Axe checks passed in light and dark themes.
2. Initial visual comparison found a P2 desktop proportion mismatch: the map stage was narrower and shallower than the source. The stage was expanded to a 112rem maximum and a 41rem desktop height. The normalized post-fix capture restores the source's map/directory balance.
3. Browser console review found P2 duplicate Natural Earth feature keys. Keys now combine feature ID and collection index; the post-fix reload produced no new duplicate-key errors.

## Open Questions

None. The extra pilot/concept mode control and the truthful synthetic-data disclosures are approved hybrid requirements rather than design drift.

## Implementation Checklist

- [x] Desktop and mobile visual comparison completed.
- [x] Light and dark themes checked.
- [x] Primary network interactions checked.
- [x] Browser console checked after fixes.
- [x] Accessibility and reduced-motion behavior checked.
- [x] Visual baselines updated after review.

## Follow-up Polish

No blocking polish remains. A future iteration could add curved geographic route arcs, but the current straight corridor treatment is clear, performant, and faithful to the selected visual language.

final result: passed
