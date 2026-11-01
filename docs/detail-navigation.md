# Persistent navigation while browsing

Flow, movement, pick, card and event browsing details open as an inline surface inside their tab scene. They no longer present a native full-screen Modal over the navigator. The existing native bottom tabs remain the only navigation menu; no duplicate menu is drawn over them.

- Back closes the detail and returns to the same browse page.
- Changing tabs leaves each pane's saved selection intact. Returning resumes that pane.
- The native tab bar is configured not to minimize on scroll. Background browse content is hidden from screen readers while an inline detail is open, without trapping access to the tab bar.
- Nested information sheets inherit inline presentation and retain bottom-tab access.
- Android Back dismisses the deepest focused inline layer; listeners are removed on tab blur/unmount.
- Root inline details reserve top/bottom safe areas. On iOS the native Screens safe-area component reserves the native tab interface inset, not just the home indicator; nested information does not double-apply it.
- Creation/editing and workout-builder dialogs remain explicitly modal, as do system confirmation/share dialogs. This change is about browsing, not allowing navigation through a system dialog.
- Authenticated shared links resolve/hydrate their item and redirect to the real Flows/Picks/Events tab with the requested detail selected. They no longer build a copy of the app outside its tab navigator. Signed-out links still preserve the requested item through sign-in.

Tests render the real detail-surface code using DOM/native adapters, exercise inline vs modal and nested Android Back cleanup, and check tab/link wiring. An iOS export validates bundling, not physical-device native-tab layout. Check that the bottom bar is visible and tappable on iOS and Android, including small screens, before claiming native UI validation.
