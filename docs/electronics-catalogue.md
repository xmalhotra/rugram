# Electronics browsing

Picks → Electronics uses a compact horizontal category rail, followed by small rectangular product rows. Category selection filters locally without a budget form. Tapping a product opens its existing details/specifications/save/alternatives page; the separate price-and-arrow link opens its seller externally.

The initial addition contains 50 manufacturer-sourced catalogue entries: ten headphones, ten earbuds, ten laptops, ten speakers and ten TVs. TV entries distinguish screen-size variants, not ten unique model families. Existing charging, desktop, wearable and accessory Picks remain available. This is a starting catalogue, not a market-wide top-ten ranking, independent test, or influencer endorsement.

## Sources and caveats

- boAt: official product and collection JSON feeds; exact available colour variant prices and photos.
- ASUS India: official product-page Product/Offer structured data in INR. Entries refer to product families; displayed offers do not promise every RAM/storage/processor configuration at the same price. No hidden sorting price was used.
- Vu: official product JSON feed with exact screen-size variants. The feed reported these direct-store variants unavailable; the app labels that state. Dealer inventory is not connected.

`shared/electronics-snapshot.json` records checked time, source URLs, price basis, variants and stock snapshots. `scripts/research-electronics.mjs` is a read-only research utility that prints a candidate snapshot. Running it does not silently republish or overwrite Admin changes.

Prices and stock are not live. No fake discounts, affiliate IDs, reviews, endorsements or quality ranks were added. Photography is referenced from manufacturer image URLs; obtain appropriate reuse permissions before commercial deployment.

Admin → Content → Products can edit/archive the seeded records, including specs, source dates, photos, purchase options and availability. App settings control enabled Tech subcategories. Existing installations with custom settings must enable Headphones, Earbuds, Laptops, Speakers and TVs before publishing edits in those types. Default settings include them.

Local demo mode loads the new records without clearing profiles. Database deployments use `npm run db:seed-flow-resources`; that inserts missing IDs only and preserves existing moderation/edits. No database seed was run as part of this change.

Test: `node --import tsx --test tests/electronics.test.ts`.
