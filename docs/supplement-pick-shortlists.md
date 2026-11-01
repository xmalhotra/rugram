# Picks → Supplements

## Customer experience

The first four categories are Collagen peptides, Creatine, Whey protein and Plant-based protein. Each has five explicit, photographed product entries. Existing hydration, fuelling and label categories remain available. “Plant-based whey” is not used: whey is dairy-derived.

Choose a category to see one full-width product card at a time. Swipe horizontally or tap a numbered position. Ranks 1, 2 and 3 have Gold, Silver and Bronze tags inside the top-left of their card; positions 4 and 5 retain their numbers. The card’s ⓘ opens information directly, without an educational-slide gate. Category guidance, suitability and source links are also behind ⓘ.

## Meaning of ranks

These are editorial shortlists, not quality certifications or clinical rankings. The order is a presentation selection based on declared ingredient source, distinct formula/flavour options, pack choice, listed cost and availability of public manufacturer information. It is not a quantitative best-value score: prices are not normalised by protein content, dose or serving, and the products are not interchangeable. No affiliate payment or user-review count controls the order. The first three legacy whey positions are retained.

Each product’s information contains its reason for inclusion, restrictions, trade-offs, selection criteria and sources. We have not independently tested current batches. Manufacturer marketing efficacy, absorption and anti-ageing claims are not reproduced as verified outcomes. Medals do not mean suitability for a particular person. An unavailable or moderated product is removed without renumbering the surviving recorded ranks.

## Sourcing and content boundaries

Sixteen additional exact-variant listings were read from the public manufacturer storefronts and their product data on 24 October 2026. Four legacy sourced records complete the twenty entries. New listings are in `shared/curated-supplement-products.ts`; exact variant URLs, manufacturer images, pack snapshots, timestamps and prices are stored per product. The GNC collagen image is specifically the selected 200 g variant rather than the generic 100 g lead image. Stock is marked unknown because storefront data and rendered purchase indicators can disagree; verify at checkout.

Collagen means oral nutrition products only, as confirmed by the user. No injectable, prescription or research peptides are offered. Animal source and allergen differences remain visible under information; collagen is not represented as necessary or as a substitute for varied dietary protein. No dose, treatment or guaranteed benefit is prescribed.

Legacy seed selections expand from three whey/one creatine entries to five. Custom editorial lists and explicit empty lists are preserved. The bootstrap resource resolver uses the same category model as the app, so all selected products can arrive even when absent from the first paginated feed page. Catalogue moderation is still authoritative. Running local demo instances may receive missing shortlist metadata only for source-identical legacy picks; existing source, price and assessment edits are not overwritten.

## Validation boundary

Unit and component-callback tests cover catalogue eligibility, five-item resolution, rank/medal preservation, navigation, direct information, paging and numbered selection. Typechecks, lint and an iOS export are local build evidence. They do not establish physical-phone swipe behaviour, seller fulfilment, independent product quality or clinical suitability.
