# TripSync Brand Guidelines

Version 1.1 · Warm Civic Mobility · Civic Clay

TripSync is the public product brand for the UM Siklab smart-boarding project. `IQueue` may remain in legacy technical identifiers and historical material, but it must not appear as a second customer-facing brand.

## Quick reference

- **Promise:** Calm, coordinated, inclusive inter-provincial travel.
- **Tagline:** Board smart, travel smarter.
- **Voice:** Calm, competent, inclusive, locally grounded.
- **Heading typeface:** Lexend, 600–700.
- **Body typeface:** Source Sans, 400–600.
- **Primary action:** Civic Action Blue `#175CD3`.
- **Brand anchor:** Civic Navy `#0B1F33`.
- **Accent:** Signal Orange `#F97316`, decorative only.

## Brand voice

| Trait | We are | We are not |
| --- | --- | --- |
| Calm | Clear about the next step and current status | Alarmist or overloaded with urgency |
| Competent | Specific, evidence-aware, and operationally useful | Vague, magical, or overconfident about AI |
| Inclusive | Respectful of access needs, language, and travel context | Patronizing or dependent on color-only meaning |
| Locally grounded | Familiar with Mindanao and ASEAN travel realities | Generic “future city” marketing |

Use short, direct sentences. Name what happened and what the passenger can do next. In errors, state the cause and recovery action. In success messages, confirm the outcome without exaggerated celebration.

Do not claim payment processing, live transport feeds, field-pilot results, guaranteed AI outcomes, or accuracy figures unless the product can show current evidence for the exact claim. Use “prototype,” “demo route,” or “synthetic data” wherever those qualifiers apply.

## Logo

The existing bus-and-route mark remains unchanged.

- Keep clear space equal to half the mark height on every side.
- Minimum digital size: 24px for the mark and 96px for the mark-and-wordmark lockup.
- Use the full-color mark on white, Warm Canvas, or Civic Navy.
- Use the navy monochrome mark on light neutral backgrounds and the white monochrome mark on dark or photographic backgrounds.
- Never stretch, rotate, crop, outline, shadow, recolor, or place the mark on a busy area.
- Build the horizontal lockup with the approved mark and the word “TripSync” in Lexend Semibold; do not typeset an alternative wordmark.

Approved paths and output sizes are listed in [asset-inventory.md](asset-inventory.md).

## Color system

| Role | Light | Dark | Usage |
| --- | --- | --- | --- |
| Canvas | `#F6F7F4` | `#0B1220` | Page background |
| Surface | `#FFFFFF` | `#111B2E` | Cards, sheets, menus |
| Foreground | `#132238` | `#F6F8FB` | Primary text |
| Muted foreground | `#5F6B7A` | `#B7C2D0` | Secondary text |
| Border | `#D8DEE8` | `#33425A` | Dividers and control boundaries |
| Primary action | `#175CD3` | `#6EA8FE` | Main CTA, links, focus |
| Success | `#087A55` | `#31B983` | Confirmed and available states |
| Warning | `#B45309` | `#F6B84A` | Time-sensitive or caution states |
| Danger | `#B42318` | `#FF8178` | Errors and destructive actions |

Logo Blue `#1A73E8`, Civic Navy `#0B1F33`, Civic Teal `#087A55`, and Signal Orange `#F97316` are brand colors. Signal Orange is a route marker and decorative accent; it is not a white-text button background. Status meaning always includes text or an icon.

## Typography

| Role | Family | Weight | Desktop / mobile | Line height |
| --- | --- | --- | --- | --- |
| Display | Lexend | 600 | 56px / 40px | 1.1 |
| H1 | Lexend | 600 | 40px / 32px | 1.2 |
| H2 | Lexend | 600 | 32px / 26px | 1.25 |
| H3 | Lexend | 600 | 24px / 22px | 1.3 |
| Body | Source Sans | 400 | 16px / 16px | 1.5 |
| Small | Source Sans | 400 | 14px / 14px | 1.45 |
| Caption | Source Sans | 600 | 12px / 12px | 1.35 |
| Operational data | System monospace | 500–700 | Contextual | 1.3 |

Use tabular figures for times, fares, seats, capacity, and forecast values. Avoid body copy below 14px and keep long-form text within 65–75 characters per line.

## Layout and components

- Use a 4px base grid with primary spacing steps of 8, 12, 16, 24, 32, 48, and 64px.
- Controls use 12px corners, cards 20px, and major panels 24px.
- Civic Clay is the default material language. Use the shared low, raised, inset, and pressed elevation roles; never invent per-component shadow recipes.
- Light mode uses a warm canvas, bright raised surfaces, and a top-left highlight. Dark mode uses restrained navy depth with lower-contrast highlights rather than a literal inverted light treatment.
- Passenger surfaces may use expressive raised depth. Operator charts, tables, logs, and dense data regions remain flat or use a shallow inset well so decoration never competes with data.
- Keep one dominant CTA per view and a minimum 44px interactive height.
- Use the route-line and station-node motif sparingly to explain travel, progress, or connectivity.
- Passenger surfaces are welcoming and spacious; operator surfaces are denser but use the same tokens and component states.
- Hover lift is limited to 2px. Pressed controls replace outer elevation with inset depth without changing layout bounds.

## Iconography and imagery

Use Lucide outline icons on a 16, 20, or 24px grid with consistent stroke weight. Decorative icons beside visible text are hidden from assistive technology; icon-only controls always have an accessible name.

Photography should show real regional terminals, vehicles, staff, and passengers in natural daylight. Representation must include varied ages and access needs without staging people as symbols. Avoid generic neon cities, robots, holograms, or imagery that implies capabilities the prototype does not have. Illustrations use flat route geometry, station nodes, and the approved palette.

## Motion

- Fast feedback: 120ms.
- Standard state change: 200ms.
- Emphasis or panel transition: 300ms.
- Animate opacity and transforms only; never block input or depend on animation completion for correctness.
- Route, progress, seat, and confirmation motion occurs once in response to a user action.
- No parallax, looping decorative pulses, scroll-jacking, or broad entrance choreography.
- Under reduced motion, show the final state immediately.
- Under reduced motion, remove clay lift and depth transitions while preserving clear hover, focus, pressed, and disabled states.

## Accessibility

Normal text meets WCAG AA 4.5:1 contrast; large text and meaningful UI boundaries meet 3:1. Focus remains visible, layouts reflow without horizontal page scrolling, fixed UI does not cover content, and color is never the only signal. Theme behavior, motion, keyboard access, and screen-reader names are part of the brand standard—not implementation extras.

The machine-readable source for these values is [design-tokens.json](design-tokens.json).
