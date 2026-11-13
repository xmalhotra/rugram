# Rebrand to Qram

The public name is **Qram**, said in one beat like क्रम. The icon is **क्र.** only: the conjunct, then a full stop drawn as a disc. The dot is part of the mark and stands for the म in क्रम. The Latin word sits outside the icon.

The app is not in the stores, so the display name, URL scheme, and bundle ids can change together. Existing demo sessions keep working because the old cookie and environment names stay as aliases.

Colors stay. The mark uses the current lime on the current dark and light grounds. No dependency changes.

## 1. Draw the mark

Build one SVG, then the rasters the store config already points at.

- `mobile/assets/brand/mark.svg` is the source: क्र and the disc, same stroke weight, dot clear of the र diagonal, padding inside the center 66% so the Android circle mask does not clip the hook.
- From that file, export:
  - `icon-ios.png` — 1024, no transparency
  - `adaptive-foreground.png`, `monochrome.png`, `splash-light.png`, `splash-dark.png` — 1024, transparency, artwork inside the 17–83% safe zone
  - `notification.png` — 96, transparency
- Replace the checkmark in `mobile/src/design/BrandMark.tsx` with the same SVG. Accessibility label becomes `Qram`.
- Check the mark at icon size and at the 96px notification size. If the diagonal vanishes, the letter reads as क.

`tests/brand-assets.test.ts` already enforces these dimensions and the accessibility label. Update the label assertion and run that test before any other rename.

## 2. Change what people see

| Surface | Now | Becomes |
| --- | --- | --- |
| Home wordmark in `mobile/App.tsx` | BetterHabits. | qram |
| Loading title, sign-in shell, error title | BetterHabits | Qram |
| Search label and placeholder | Search BetterHabits | Search Qram |
| Leave-app sheet, seller hint, account export, admin header | BetterHabits | Qram |
| Default catalogue title in `mobile/src/ContentFields.tsx` | BetterHabits | Qram |

The full stop lives only in the icon. The wordmark is `qram` with no second dot.

Store and link identity in `mobile/app.json` and `shared/sharing.ts`:

- Display name `Qram`
- Slug and scheme `qram`
- iOS bundle id and Android package `com.qram.app`
- Shared links `qram://pick/…`, `qram://flow/…`, `qram://event/…`

`tests/sharing.test.ts` expects the old scheme. Update it with the links.

A phone that already has the dev build installed will see this as a new app, because the bundle id changes. That is acceptable before a store release.

## 3. Keep old sessions working

New names are preferred. Old names still read.

- Session cookie becomes `qram_session`. Keep reading `betterhabits_session` and `rugram_session` in `src/lib/session.ts`.
- `QRAM_DEMO_MODE` is the setting to document. `BETTERHABITS_DEMO_MODE` and `RUGRAM_DEMO_MODE` stay as aliases and still error if they disagree. Same pattern for `OPENAI_QRAM_MODEL`.
- Update `.env.example`, `.github/workflows/ci.yml`, and the runtime-config tests. Leave a developer’s local `.env.local` able to boot on the old variable.
- On-device keys `betterhabits-token` and `betterhabits-search-*` become `qram-token` and `qram-search-*`. Local sign-in and recent searches reset. There is no production account to migrate.

## 4. Rename the code to match

After the screens are right, rename `BetterHabitsScreen` and `BetterHabitsPane` to `QramScreen` and `QramPane`, and the call sites in the routes. The mobile package name in `mobile/package.json` becomes `qram-mobile`.

Do not rename the git repo, the working folder, or old planning files (`suggestions.md`, `suggestions-v2.md` through `suggestions-v4.md`, frame-crop reports). Update the live docs only: `README.md`, `mobile/README.md`, `mobile/DESIGN_SYSTEM.md`.

## 5. Check

- `tests/brand-assets.test.ts` for the new icon set and the Qram label.
- `tests/sharing.test.ts` and `tests/runtime-config.test.ts` for the scheme and the env alias.
- `npm test` for the rest of the suite.
- On a phone: cold start shows क्र. and the word qram, search and the leave-app sheet say Qram, and a shared link opens with `qram://`.

No commit and no store submission until that pass is done.
