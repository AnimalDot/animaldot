# AnimalDot Design System

Single source of truth for design tokens and component patterns across **web** and **mobile**.

## Tokens

- **`tokens.json`** – Canonical colors, typography, spacing, and radius. Align with human-centered design (calm technology, minimal necessary information) and WCAG 2.2 contrast where applicable.
- **Web:** `web/src/index.css` (CSS variables) and `web/tailwind.config.ts` consume these semantics (primary, secondary, success, heart/resp/temp/weight).
- **Mobile:** `mobile/src/theme/tokens.ts` implements the same palette (light/dark) and semantic colors.

## Health-specific UX

- **Species and ranges:** Species-specific vital ranges and SRR logic are shared via types and API; both platforms show consistent “normal range” and alerts.
- **Progressive disclosure:** Overview first (sleep quality, key vitals), then detail (full vitals, history), then trends (day/week).
- **Calm technology:** Critical alerts visible but not overwhelming; user-configurable thresholds; avoid alarm fatigue.

## Components

Core components aligned across platforms:

| Component   | Web              | Mobile                    |
|------------|------------------|---------------------------|
| VitalCard  | `web/src/components/VitalCard` | Similar card in LiveDashboardScreen |
| StatusPill | `web/src/components/StatusPill` | Status indicator in mobile |
| Buttons    | PrimaryButton, SecondaryButton | Button in UI.tsx |

Naming and behavior (e.g. normal range display, unit conversion) are kept consistent so that web and mobile feel like one product.
