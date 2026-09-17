# TripSync UI/UX + Frontend QA Audit

Date: 2026-09-17  
Scope: landing page, passenger booking journey, mobile reflow, booking confirmation, and operator dashboard  
Target: a clear, trustworthy, accessible demo experience across desktop and mobile

## Overall verdict

The product already looks cohesive and demo-ready at a glance. The landing page has a confident visual identity, the booking journey has a clear four-step structure, the seat recommendation is easy to understand, and the operator dashboard communicates operational status efficiently.

It is not release-ready yet. The highest-risk defect allows a user in the Asia/Manila timezone to book and receive a confirmed pass for the previous calendar day. The automated QA suite has also drifted from the current UI, and several booking controls do not expose accessible names.

## Captured steps

1. Landing page, mobile — Healthy. Strong hierarchy and large tap targets. Screenshot: `01-landing-mobile.png`.
2. Landing page, desktop — Healthy with trust caveats. Clear proposition and strong hero, but the accuracy claim needs evidence or prototype disclosure. Screenshot: `02-landing-desktop.png`.
3. Booking search, desktop — At risk. The page is visually clear, but it defaulted to 2026-09-16 while local time was already 2026-09-17. Screenshot: `03-booking-search-desktop.png`.
4. Search results, desktop — Healthy. Price, remaining seats, accessibility inventory, and the next action are scannable. Screenshot: `04-search-results-desktop.png`.
5. Passenger preferences — Mostly healthy. Assistance needs are correctly elevated above affinity preferences; the form remains understandable. Screenshot: `05-preferences-desktop.png`.
6. Seat recommendation — Healthy. The selected seat, availability states, and accessibility-priority seats are visible and screen-reader descriptions are detailed. Screenshot: `06-seat-recommendation-desktop.png`.
7. Booking confirmation — Critical defect. A past-date trip was accepted and issued a valid-looking QR boarding pass. Screenshot: `07-confirmation-desktop.png`.
8. Booking search, mobile — Mostly healthy. No horizontal page overflow, but quick routes are clipped without an affordance that the row scrolls. Screenshot: `08-booking-search-mobile.png`.
9. Search results, mobile — At risk. The floating assistant and fixed navigation cover parts of the lower result card during normal scrolling. Screenshot: `09-search-results-mobile.png`.
10. Operator dashboard — Healthy. Good information density, useful status colors, readable forecast chart, and clear decision actions after loading completes. Screenshot: `10-operator-dashboard-desktop.png`.

## Highest-impact findings

### P0 — Past-date booking can be confirmed

The default date is derived from UTC (`toISOString`) rather than the user's local calendar date. Around midnight in UTC+8, the form therefore starts on the previous day. The field has no `min` constraint, and the API accepted the date through confirmation.

Recommendation: derive the default in local time, set `min` to the local current date, validate before search and confirmation, and reject past travel dates on the backend. Add a regression test with an Asia/Manila browser timezone around 00:01.

### P1 — Accessibility names are missing on the booking search

The origin, destination, and date fields appeared as unnamed controls in the accessibility tree. The sort control also exposed its value without a name. Wrapping an input in a `label` does not provide a name when that label contains no readable text.

Recommendation: add explicit visible or visually hidden labels linked with `htmlFor`/`id`; name the sort control; retain placeholders only as examples. Confirm with keyboard navigation and a screen reader.

### P1 — Automated QA has drifted from the product

The production build and TypeScript checks pass, but lint fails with 9 errors and 7 warnings. The end-to-end run produced 1 pass, 3 failures, and 6 tests not completed before the hung run was stopped. The three failures are stale selectors rather than the current flow failing:

- scanner test expects “Camera QR scanner,” “Start camera,” “QR token,” and “Verify Pass”; the UI now uses “Boarding Pass Verification,” “Gate QR Scanner,” “Live Video,” “Raw Signed Boarding Token,” and “Verify Token”;
- single-booking test expects “Phone number” and old affinity copy; the UI now says “Mobile number” and “Seatmate affinity matching”;
- family test expects “Family booking” and “Load BIDA demo family”; the UI now says “Group Booking” and “Load demo group.”

Recommendation: update selectors to current accessible names, avoid assertions on expendable marketing copy, and add date-boundary, mobile-overlay, and accessible-name checks.

### P1 — Portfolio trust claims do not match the demonstrated state

The hero advertises “≥70% Surge Accuracy,” while the current operator capture identifies the forecast source as `heuristic`. The journey copy also promises “Book & Pay,” but this flow goes directly from seat confirmation to boarding pass.

Recommendation: either surface the validated model/evidence behind the metric and implement payment, or relabel both claims as prototype/demo behavior. For a judging portfolio, honest evidence improves trust more than unsupported certainty.

### P2 — Mobile overlays compete with booking content

The assistant trigger and bottom navigation are both fixed. On the results screen they overlap the second card, including its price/content area.

Recommendation: reserve at least the combined overlay height in mobile page padding, dock the assistant into the navigation, or hide/minimize it during the core booking funnel.

### P2 — Horizontal quick routes lack a scroll cue

The row scrolls and does not create document-level horizontal overflow, but the last chips are visibly clipped and the scrollbar is hidden.

Recommendation: add a trailing fade, “More routes” control, or wrapping layout.

## Strengths

- Strong brand continuity across landing, passenger, and operator surfaces.
- Clear progress indicator and one obvious primary action per booking step.
- Accessibility requirements are treated as hard constraints before optional affinity matching.
- Seat buttons expose seat number, availability, side, type, and priority in accessible descriptions.
- Mobile pages showed no document-level horizontal overflow at 390 px.
- The confirmation view makes route, seat, date, boarding window, and QR pass easy to scan.
- Operator charts and decision actions settle into a compact, coherent dashboard.

## Frontend QA results

| Check | Result |
| --- | --- |
| TypeScript (`npx tsc --noEmit`) | Pass |
| Production build (`npm run build`) | Pass |
| ESLint (`npm run lint`) | Fail — 9 errors, 7 warnings |
| Browser console during audited route | No warnings or errors observed |
| Mobile document overflow at 390 px | Pass — `scrollWidth` matched `innerWidth` |
| Existing Playwright suite | Incomplete — 1 pass, 3 stale-selector failures, 6 not completed before hung run was stopped |

## Evidence limits

This was a combined screenshot, interaction, source, build, and automated-test audit. It does not establish WCAG compliance. Contrast was reviewed visually but not measured across every state; full keyboard order, focus restoration, screen-reader output, zoom to 400%, reduced motion, network throttling, real camera hardware, and payment behavior still require dedicated testing.
