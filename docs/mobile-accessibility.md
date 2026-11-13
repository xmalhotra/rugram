# Mobile accessibility verification

## Automated checks

`npm run test:mobile-accessibility` parses TSX with the existing TypeScript
dependency and checks native Pressable/Touchable elements in `mobile/src` and
`mobile/app` for explicit roles and labels. Decorative `accessible={false}`
elements are excluded. The scan is in CI. It does not understand every native
component, detect clipping or certify focus order.

The pass corrected 26 missing labels across search, event creation, learning
guides and card/product navigation. Shared 44-unit minimum width/height literals
were raised to 48 for cross-platform touch targets. Existing selected/checked
states are retained. Decorative OTP boxes remain hidden from assistive technology;
one native field provides the editing target.

## Required physical-device checklist (not yet verified)

Run each task with VoiceOver on iOS and TalkBack on Android, at the largest text
size, and repeat with system Reduce Motion enabled. Record device, OS/build,
result and any defect; none of the rows below is a claimed manual pass.

| Task | iOS VoiceOver | Android TalkBack |
| --- | --- | --- |
| Enter phone, paste/autofill OTP and sign in | Not tested | Not tested |
| Choose focus, inspect starter and add it | Not tested | Not tested |
| Complete and undo a Today step | Not tested | Not tested |
| Save a pick and find it in saved picks | Not tested | Not tested |
| Compare product alternatives | Not tested | Not tested |
| Request an event place and cancel | Not tested | Not tested |
| Submit a creator product | Not tested | Not tested |
| Approve a hosted-event guest | Not tested | Not tested |
| Approve or reject a creator submission | Not tested | Not tested |
| Export data and type-confirm account deletion | Not tested | Not tested |

Also inspect sheet focus containment/restoration, toast announcements, stories
remaining manual, keyboard reachability, contrast in both themes and every sticky
footer/home-indicator inset. Full Xcode/Android SDK are absent on the current
machine, so a native development-build/manual pass remains an open release gate.
