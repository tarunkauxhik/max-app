# Design system

Living document. Project-owned, zero dependencies, no UI kit (ADR-003, ADR-004).

Reuse a primitive before writing a new one. If a screen needs a variant, add it to the
primitive rather than styling around it locally.

## Tokens — `constants/tokens.ts`

Never hard-code a colour, radius or font size in a screen. Read tokens through
`useTheme()` (`hooks/use-theme.ts`), which resolves light or dark from the system scheme.

| Group | Values |
|---|---|
| `Spacing` | `xxs` 2 · `xs` 4 · `sm` 8 · `md` 12 · `lg` 16 · `xl` 20 · `xxl` 24 · `xxxl` 32 |
| `Radii` | `sm` 8 · `md` 12 · `lg` 16 · `xl` 20 · `pill` 999 |
| `MinTarget` | 48 — Android Material's minimum, applied on both platforms |
| `Typography` | `display` · `title` · `heading` · `body` · `bodyStrong` · `caption` · `micro` |
| `Motion` | `fast` 120 · `base` 180 — declared, not yet used |
| `Elevation` | `flat` · `raised` (Android `elevation`, iOS shadow) |

### Colour

13 semantic keys, light and dark. Two are easy to confuse:

- **`border`** — decorative hairlines and dividers. Carries no meaning.
- **`borderStrong`** — control outlines that carry meaning. Holds the 3:1 obligation.

**Every colour pair used for text or a meaningful boundary must pass a deterministic WCAG 2.1
calculation before the palette changes** — 4.5:1 for ordinary text, 3:1 for large text and UI
boundaries. Verified by calculation, never estimated. The M1a palette passed 32 of 32 pairs.

System fonts only. Custom fonts need the SDK 54 config plugin, which embeds at build time and
requires a prebuild.

## Primitives — `components/ui/`

| Primitive | Use for |
|---|---|
| `Screen` | Every screen root. `edges` selects which safe-area edges to pad |
| `Text` | All text. `variant` + `tone`; font scaling is uncapped by design |
| `Card` | Raised content surface |
| `Button` | `primary` / `secondary` / `ghost`; optional `accessibilityLabel` |
| `ActionRow` | A checkable daily action |
| `SettingsRow` | A settings row; **interactive only when given `onPress`** |
| `SummaryRow` | A reviewed value plus an Edit that returns to its step |
| `ProgressBar` | Bounded progress with a spoken label |
| `WeekBars` | Seven-day completion, plain views, no chart library |
| `StatTile` | A number over a caption |
| `OptionGroup` | Single select, `wrap` chips or `stack` with notes |
| `MultiOptionGroup` | Multi select with a cap |
| `TextField` | Labelled input with hint and inline error |
| `EmptyState` | Neutral tray icon, title, body |
| `Skeleton` | Static loading block — deliberately no shimmer |

`Screen` defaults to `['top', 'left', 'right']`, which suits a tab screen with no header. A
screen inside a stack **that shows a header** must drop `top` and add `bottom`, or the header
inset is padded twice.

## State patterns

Use these exactly; do not invent a fourth way to say "nothing here".

| State | Pattern |
|---|---|
| Loading | `Skeleton` blocks inside a container marked `accessible` with one label |
| Empty | `EmptyState` plus exactly one primary action |
| Disabled | `Button disabled` plus an `accessibilityHint` naming what is missing |
| Error | `{ status: 'error'; message; retry }` — shape agreed, not yet rendered (ADR-009) |
| Success | `Text tone="success"` caption stating what happened and what was *not* saved |
| Destructive | Own section, own heading, a warning line, and a hint stating the consequence |
| Non-functional | No `onPress`; `View` with `text` role, no chevron, visible "Coming later" |

Never a do-nothing `onPress`. A button role on something that cannot be pressed is a false
promise to a screen-reader user, and a chevron is the same promise made visually.

## Accessibility rules

- **48dp minimum** on every interactive target.
- **Never colour alone.** `ActionRow` signals completion three ways: filled box, checkmark
  glyph, strikethrough, plus `accessibilityState.checked`.
- **One node per row.** Group compound content with `accessible` and a composed label; hide
  decorative children with `importantForAccessibility="no-hide-descendants"`.
- **Headers.** Screen and step titles carry `accessibilityRole="header"` so screen-reader
  heading navigation works.
- **Live regions** are Android-only; `OptionGroup` pairs them with
  `AccessibilityInfo.announceForAccessibility` on iOS.
- **Font scaling is uncapped.** Layouts flex; nothing clamps the user's chosen size.
- **Reduced motion** needs no handling today: MAX code contains no animation. Anything added
  later must honour it.

## Performance

`app.json` enables React Compiler, so components are auto-memoised. **Do not add manual
`useMemo`/`useCallback` for performance** — only for referential stability that behaviour
depends on.

Lists use `.map()` inside a `ScrollView`, not `FlatList`. Every list is small and bounded
(≤7 items). Switch to `FlatList` when data becomes server-driven and unbounded, not before —
virtualisation costs complexity and nested-scroll bugs that a 5-row list does not repay.
