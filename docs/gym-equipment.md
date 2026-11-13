# Gym equipment: learn → choose → optional Picks

Workout discovery includes **Choose equipment for your session**, an addable preparation flow. Its guide also opens from Picks → Equipment and You → Equipment you can access.

The central `shared/gym-supports.ts` taxonomy separates lifting belts, wrist wraps, lifting straps and knee sleeves. Each has a small original code-native visual, purpose, limits, comparison points and source links. Belt comparison includes an illustrative 10:13 thickness diagram—not a safety, quality or ability ranking. Sleeves, wraps and medical braces are explicitly not interchangeable.

The intended habit is to consider equipment for the actual session, check fit and decide whether it is useful—not to wear everything on every workout. Equipment has no gender; the guide neither repeats gym stigma as fact nor encourages buying gear to prove experience. Pain, injuries and health restrictions require appropriate professional guidance, not a product suggestion. Manufacturer descriptions explain specifications; the cited small belt-pressure study does not establish injury prevention.

## Connections and persistence

Picks gains a distinct **Equipment** category, without reviving archived legacy Gear (such as the old water bottle). `equipmentType` and use-case tags must match. API validation rejects non-equipment carrying support tags, equipment without a type, and straps masquerading as wraps. Creator submissions keep the existing admin moderation workflow. Admin/creator forms support the new category and matching habit automatically.

The guide resolves the same published product IDs as Picks via `flowResources`, independent of feed pagination and city. Budget filtering is per item/pair listing, not full delivered cost. Opening details returns to the originating flow through the existing Back to your flow action.

Users can record access to each equipment **type** (owned or gym-provided). This is not an inventory of exact model/size, a purchase, an instruction to use the tool, or a workout completion. It persists through authenticated `equipment` actions into profile JSON; no new table migration is required. Updates are idempotent, isolated per user and separately tracked as `equipment_available` / `equipment_removed`. Home story suggestions omit purchase prompts for equipment types already recorded as accessible; explicit comparison remains available.

## Starting product catalogue

Seven source-linked listings were inspected on 2026-10-15: Cali Gears 10 mm belt; SBD 10 mm and 13 mm belts, Classic wrist wraps, traditional straps, and Classic 5 mm/7 mm knee sleeves. Prices and variants are seller-page snapshots, not checkout totals, live stock or independent quality testing. No creator backing, clinical validation or exhaustive market coverage is invented. This small catalogue is not a best-buy ranking, and price tier does not mean stronger evidence. Details retain pair/single unit notes and variant caveats; the Cali listing notes potential shipping cost.

Demo mode imports the canonical listings without overwriting existing records or user state. For database deployments run `npm run db:seed-flow-resources`; that inserts absent IDs without replacing moderation decisions. Source data is in `shared/curated-gym-products.ts`. Periodic price, stock, return-policy and content review remains an operating requirement; automatic vendor syncing is not implemented.

Automated checks cover taxonomy, matching Picks, budget/category filters, submission schema and inventory semantics; the isolated 10,000-user function simulation adds inventory idempotency/isolation checks. Physical-device accessibility/layout, clinical/editorial review and the new JSONB update against the deployment database remain release checks. Compiling an iOS bundle is not physical-device proof.
