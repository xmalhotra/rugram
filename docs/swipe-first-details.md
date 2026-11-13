# Swipe-first consumer details

Picks, credit-card Picks and Flows now open in a shared three-page visual deck, inspired by the user-provided screenshots. The screenshots are layout references only: none of their advertised card rates or brand partnerships were copied into product data.

- First page: identity, large product photo or code-drawn illustration, one short purpose.
- Second: essentials, benefits or journey overview. Full instructions/specifications are available through an explicit guide/details button.
- Third: choices, related Picks/events, seller links or fees.

A Save/Add control remains outside the paged content and stays visible. Dots indicate progress, are tappable, and have accessible labels; accessibility increment/decrement actions navigate pages. Horizontal swipes do not auto-advance: this is an intentional reading journey, separate from the existing timed Home stories. Individual pages can scroll vertically for small screens or larger text. Rotation preserves the current page.

`SwipeDeck.tsx` and `DeckPage` provide the shared presentation; native `Sheet` supports full-screen/non-scrolling content for these decks without changing admin/editor/registration sheets. Existing details are retained in on-demand sheets: sources, contraindications, fee waiver conditions, full benefit lists, alternatives, exercise cards and user-owned data controls are not deleted. Preview flows still cannot write personal data before being added.

The layout uses current catalogue data and existing illustrations/photos; no new endorsement, health-outcome or product-superiority claims are generated. Admin continues to edit the underlying content as before.

Automated verification covers page bounds, paging/accessibility wiring, all three entry points, native text safety, type checks and iOS export. A physical-device visual/accessibility pass remains important, especially with larger text settings. No screenshot-level native interaction test is implied by the bundle check.
