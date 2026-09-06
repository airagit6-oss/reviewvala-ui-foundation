# ReviewVala™ Product Prototype

## Goal
Build a polished, UI/UX-only review-management workspace that feels calm, trustworthy, and enterprise-ready while remaining approachable for non-technical users. All content and interactions will use realistic local mock data only.

## Product foundation
- Create a responsive app shell with compact navigation, business/location selector, global search, notifications, and a clear user/profile menu.
- Establish an original visual system: warm white workspace, deep ink navigation, emerald trust accents, restrained amber status cues, crisp typography, subtle depth, and concise motion.
- Keep “Powered by Software Vala™ — The Name of Trust” as a quiet endorsement rather than a competing brand.
- Add desktop, tablet, and mobile adaptations, including a mobile bottom navigation and drawers where appropriate.

## Core experience
- Build a role-aware Overview dashboard with performance summary, rating movement, response queue, recent reviews, alerts, and location comparison.
- Build a unified Reviews workspace with search, filters, channel/source indicators, sentiment and status, selection, reviewer context, internal notes, assignments, and a detailed response panel.
- Build the Response Center with an approval queue, response composer, tone controls, suggested drafts, saved templates, collaboration context, and response history.
- Build Ratings, Analytics, Alerts, Locations, Team, Reports, and Settings views with realistic data, useful controls, and meaningful visualizations.
- Surface multi-business, multi-location, assignment, approval, and role concepts throughout the experience without implementing permissions or persistence.

## Interaction and states
- Make navigation and primary controls functional in the browser using local React state.
- Include global search, notification panel, business switching, filters, tabs, date-range controls, drawers, and modal-like detail views.
- Add representative loading, empty, and error states through a dedicated state preview control so the prototype can be reviewed without backend failures.
- Add accessible labels, focus states, tooltips for unfamiliar icons, keyboard-friendly interactions, and reduced-motion support.

## Technical details
- Use the existing TanStack Start app, React 19, Tailwind CSS v4, lucide-react, and Recharts.
- Define all visual values as semantic tokens in `src/styles.css`; no backend, database, authentication, network calls, or production business logic.
- Keep the main product in `/` as the requested prototype, with route-specific metadata.
- Create focused local components and mock-data modules rather than one monolithic page.
- Validate the build and inspect the running UI at desktop and mobile sizes, including overlays and the main Reviews workflow.
