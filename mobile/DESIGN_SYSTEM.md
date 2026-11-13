# Qram native UI

> How screens are drawn and put together (tokens, shared parts, page layout, colour, navigation and
> floating layers) is set in `docs/design-consistency.md`, Part 2. This page summarises what is built.

The mobile interface follows Apple’s Human Interface Guidelines on iPhone and uses native Android controls on Android. It is an app-specific design system built with Expo UI, not an Apple certification or a web UI kit.

## Foundations

`src/design/theme.ts` exposes semantic light/dark palettes from `tokens.ts`, a restrained green action colour, spacing, corner radii and text roles. Device appearance is followed automatically. Text uses the bundled Inter family when loaded, otherwise the platform font. React Native text scales with device text size, and native fields/buttons use their platform font defaults. Primary text and accent foreground colours have separate tokens so dark-mode buttons retain contrast.

- Text roles (`<Text variant="…">`): display 34 bold, title 28, heading 22, section 20, headline 17
  semibold, body 17, callout 16, subhead 15, footnote 13, caption 12. Nothing smaller than 12.
- Spacing (`space`): 2 / 4 / 8 / 12 / 16 / 20 / 24 / 32 as xxs / xs / sm / ms / md / lg / xl / xxl.
  Page layout (`layout`): margin 16, section 24, cards 12, inset 16, inner 12, lines 8.
- Corners (`radius`): small 10, control 14, card 20, pill 999. Borders (`stroke`): line 1, active 2.
- Heights: `hit` 44 on iPhone / 48 on Android; `size.button` 52. Pressed opacity 0.6, disabled 0.45.
- One glass recipe (`GlassSurface`): blur 30, background at 15%, 1 point line.
- `tests/design-literals.test.ts` counts hand-typed values outside `src/design/` and fails if any count grows.

## Foundation update

The app icon, splash, and notification artwork use the Devanagari conjunct क्र followed by a full stop, set in Kohinoor Devanagari Semibold — the same letter as the in-app mark. The dot is part of the mark. Use it at 29 pt or larger in the app. Never squeeze, rotate or place the Latin word inside the icon. iOS artwork is opaque 1024×1024 on `#050706`; Android's foreground fits within the central 66% safe zone. The monochrome and 96×96 white notification silhouettes have transparent backgrounds. Light/dark splash artwork is configured through `expo-splash-screen`. Notification artwork is prepared but not wired to push until that separate package/integration is approved.

The committed PNGs are the artwork. Config validation is not native rendering validation:
Expo Go does not show the final standalone splash. A separately approved release
build and physical-device check are required before store submission.

Device appearance updates live through `useColorScheme`. Profile → Appearance
stores System / Light / Dark on the server. `NeonBackdrop` is dark-only.
Semantic colours live in `tokens.ts`; `illustrationAccent` replaces the ambiguous
lavender name. The white photo mat and its dark ink intentionally do not change
with appearance, because supplier cut-out images commonly have white backgrounds.
Ambient RGBA colours are decorative artwork, never text or interactive outlines.

Body text and status tokens are tested against both `bg` and `card` at 4.5:1 or
better. Filled success/warning/info/danger/action pairs are also tested at 4.5:1.
Decorative separators are not used to communicate state on their own. Exact
contrast ratios can be reproduced by `tests/neon-theme.test.ts`.

Text defaults to a maximum scale of 1.6, display text to 1.3. Labels and status
names always carry meaning in words, not colour alone. Numeric variants use
tabular figures. Physical-device large-text and screen-reader acceptance checks
remain outstanding; a successful typecheck is not a visual accessibility test.

## Shared feedback primitives

- `Skeleton shape="line|block|card"`: first-load placeholder, no looping motion yet.
- `ToastProvider` / `useToast`: queued success/error/info, four-second dismissal,
  optional Undo, announced to screen readers.
- `Banner`: persistent offline/demo/info/error notice, optional retry/dismiss.
- `EmptyState`: illustration slot, title, one sentence and one action.
- `SearchBar`: labelled input with inline error.
- `FilterChips`: single or multiple selection with selected/disabled semantics.
- `SegmentedControl`: native SwiftUI segmented picker on iOS; accessible chips
  on other platforms, since the installed universal picker has menu/wheel only.
- `StickyActionBar`: safe-area-aware primary and optional secondary action.
- `StatusPill`: semantic status colour plus a text label.
- `WeekStrip`: date selection and done counts, no streak comparison.
- `ProgressRing`: bounded visual progress plus a spoken text summary.
- `Avatar`: image with failure fallback to initials.
- `Stepper`: bounded wizard progress and spoken step number.
- `ReasonLine`: one compact explanation.
- `Button`: the one button. primary (green fill), secondary (green outline) or text; large 52 or
  regular 44; `fit`, `busy`, `destructive`. Drawn in React Native on both platforms.
- `IconButton`: SF Symbol on iPhone, Material symbol on Android; plain or outlined; text colour by
  default. Label required by its TypeScript props; loading/disabled states.
- `SectionHeader`, `Row`, `RowGroup`: a section title with an optional line and action; list rows that
  show a chevron only when they can be tapped, in one card with hairlines.
- `GlassSurface`, `TimerBar`, `ProgressSteps`: the glass recipe; a clock that always carries its word
  (Rest, Hold, Elapsed); a segmented step bar.
- `Card` takes `onPress`, so a tappable card is one button.
- `Field`: explicit keyboard type, multiline and maximum length; no label-based
  heuristics. Product/seller fields supply their server-matching limits.
- `BarChart`, `LineChart`, `Sparkline`: installed SVG rendering, token colours,
  empty-state fallback and a text alternative containing every value.

The admin-only `/design-system` route previews primitives. It is not a replacement
for the manual device matrix. Motion and the full feedback rollout follow later
prompts; existing screens have not all been migrated yet.
- iOS action controls have a 44-point minimum host; Android uses 48 dp.

## Components and native boundaries

| Component | Implementation |
| --- | --- |
| Tabs | Expo Router native tabs, SF Symbols on iPhone and Material symbols on Android |
| Buttons | `Button` in React Native on both platforms (green fill, outline or text) |
| Fields | Expo UI TextInput, backed by SwiftUI TextField/SecureField and Compose on Android |
| Selection | Native menu pickers for goals, category and budget tier |
| Habit completion | Controlled native toggles, sending explicit desired state to the API |
| Detail/editor presentation | One native bottom-sheet presenter, with scrollable React Native content inside RNHostView |
| Event date/time | Native iOS date/time control and Android system date/time dialogs |
| Cards and content | React Native layout using shared typography and colour tokens |

The sheet presenter is shared between product detail and creator submission content, avoiding competing native presentations when a creator chooses “Vouch with a source.”

## Navigation and state

`app/_layout.tsx` owns authentication-protected routes. `app/(tabs)/_layout.tsx` owns native tab configuration. `src/session.tsx` shares the current profile and mutations across routes; switching tabs does not create another session or another copy of profile state. Admin and Studio tabs are unavailable for the other roles, and the server continues to enforce authorization.

The installed SDK is Expo 57 with React Native 0.86, using `expo-router/unstable-native-tabs`.
Use Node 24 (`nvm use` from the repository root). Creators have six destinations,
so Android uses standard JavaScript tabs to avoid its five-native-tab limit.
No website is required. JavaScript export verification does not replace a native
development build and device checks.

## Verification

Mobile type checking and Expo dependency alignment passed. Both iOS and Android JavaScript/Hermes bundles export successfully. Bundling does not verify UIKit/Compose rendering: physical-device checks remain required for VoiceOver/TalkBack, large text, keyboard interactions, sheet dismissal, back navigation, role-specific tabs and appearance changes. The production-readiness audit still applies; adopting native controls does not resolve the outstanding toolchain advisories.

References: [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/), [Expo UI](https://docs.expo.dev/versions/latest/sdk/ui/), [Expo native tabs](https://docs.expo.dev/router/advanced/native-tabs/).
