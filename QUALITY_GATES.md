# Quality gates

A feature is not complete until applicable gates pass.

## Plan

- User flow and acceptance criteria are explicit.
- Current code and docs were inspected.
- External dependencies were verified.
- Security, privacy, free-tier and rollback impacts are stated.

## Code

- Strict TypeScript passes.
- Lint passes.
- No secret or sensitive-data exposure.
- Boundary inputs and backend outputs are validated.
- Loading, empty, error, retry and duplicate-action states exist where relevant.
- Existing components/tokens are reused.

## Data and security

- Ownership and authorization are enforced server-side.
- RLS policies are tested with at least two users.
- Quotas/rate limits are atomic and server-enforced.
- Database migrations and generated types are committed.

## UX

- Android physical-device flow passes.
- iOS Expo Go flow passes when the feature is supported and an iPhone is available.
- Keyboard, safe areas, back navigation, slow network, offline state and permission denial are checked.
- Accessibility labels/roles and reduced-motion behavior are reviewed.
- Colour pairs for text and meaningful UI boundaries meet WCAG 2.1 (4.5:1 ordinary text,
  3:1 large text and UI boundaries), verified by calculation rather than estimate.
- Interactive targets are at least 48dp.
- Layout survives the maximum system font size without clipping.
- State is never conveyed by colour alone.

## Git

- Diff contains only intended files.
- Working state is committed with a focused message.
- Push happens only after manual verification.
