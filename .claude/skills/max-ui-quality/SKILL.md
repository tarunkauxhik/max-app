---
name: max-ui-quality
description: Design, implement, or review high-end production UI and UX for MAX. Use for screens, components, navigation, motion, forms, empty/loading/error states, accessibility, visual consistency, responsive layout, or screenshot review.
---

# MAX UI quality

- Read the current design tokens and existing components before creating UI.
- Use project-owned primitives and official Expo/React Native controls first.
- Do not add a UI framework or styling engine without `max-dependency-gate` and an accepted ADR.
- Define every screen state: loading, populated, empty, error, offline, disabled, success and destructive confirmation where relevant.
- Keep one clear primary action, strong hierarchy, consistent spacing/radii/type, and minimal decorative effects.
- Respect safe areas, keyboard, Android back behavior, touch targets, accessibility roles/labels, dynamic text and reduced motion.
- Motion must communicate state and remain interruptible; avoid layout thrashing and expensive effects in lists.
- Reuse existing components; create a new primitive only when at least two concrete uses or a strong semantic need exist.
- Test on physical Android and review iPhone through Expo Go when supported. Require screenshots for major UI milestones.
- Record proven platform differences in `LEARNINGS.md`.
