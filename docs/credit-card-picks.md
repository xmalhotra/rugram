# Credit cards in Picks, not Flows

Picks → Credit cards opens a separate financial-information catalogue rather than treating credit as a retail product or a habit. Filter by benefit category, annual-fee ceiling, and cards already owned. Three initial variants: Axis SELECT, Swiggy **BLCK** HDFC, and IndianOil RBL **XTRA**. These are not interchangeable with Ornge, the older Swiggy card, or the standard IndianOil RBL card.

The detail view separates standard joining/renewal fees before taxes, waiver conditions, optional personal fee override (including zero), benefit type, caps, restrictions and issuer references. It does not call reward points cash cashback, call a surcharge waiver an instant discount, assume all online spends earn 5%, total every possible perk into guaranteed savings, or encourage extra spending to unlock a waiver. Unknown fees stay unknown. No application-ranking, financial suitability assessment or lending integration is implemented.

## Source review: 2026-10-15

- Axis: issuer product listing was available through search, including BigBasket, District, lounge and fee information. The listing warns of revised terms from 2026-08-28; the revised PDF could not be accessed. The card explicitly carries this review limitation, and no movie counter is inferred. Lounge eligibility and limits must be rechecked with the issuer. Old 2020 PDFs and expired general BigBasket promotions were not used as current terms.
- HDFC: BLCK product page plus the combined BLCK/Ornge issuer terms PDF dated 2026-09-22. Eligible Swiggy and select-online cashback have separate billing-cycle caps. These are not five unconditional offers on all online orders.
- RBL: issuer IndianOil/XTRA FAQ for annual membership, fuel points, redemption distinctions and surcharge conditions. Joining fee was not confirmed and is `null`. The app does not treat an advertised aggregate “valueback” figure as a cash credit.

Canonical financial content is version-controlled in `shared/credit-cards.ts`, with per-benefit source URLs and a terms revision. Financial-content review and an operating process to refresh benefits remain release requirements. No automated issuer-data feed, personalized Swiggy offer ingestion or admin card-catalog editor exists in this increment.

## Ownership and manual benefit records

`MobileProfile.cardWallet` holds only known catalogue IDs, an optional annual-fee override and manual benefit snapshots. It never asks for PAN/card number, CVV, PIN, banking passwords, statements or transaction access. The strict API accepts `card-owned`, `card-fee`, and `card-usage` with enumerated server-side card/benefit validation; extra credential fields are rejected. Removing a card requires UI confirmation and deletes its fee override and personal usage records.

Remaining benefits are **unknown** until the user enters current usage and explicitly confirms issuer eligibility. Once confirmed, the view says “left according to your log,” not bank-confirmed availability. Usage can mean visits, cashback rupees already used/accrued, reward points, or surcharge-waiver rupees—not transaction count interchangeably. The issuer remains authoritative about pending credits, reversals, spend qualification, guest access and caps.

Calendar months/quarters use Asia/Kolkata. Billing-cycle periods must be entered from the statement, contain today, and be at most 45 days. A new period or changed terms makes old remaining values unknown rather than resetting them to “all available.” The client submits the period explicitly; the server rejects stale fixed-period writes, including a month/quarter-boundary race. Snapshots are idempotent absolute values, not repeatable increments. They do not log purchases, claim realised savings or complete habits.

Data persists in existing profile JSON with atomic JSONB mutations; no schema migration is needed. Demo mode remains process-memory only. Database execution of the new JSONB paths, financial-content review, physical-device UI/accessibility and period-boundary behavior remain deployment checks; passing in-memory simulation is not production capacity certification.

Tests cover source/model separation, India calendar boundaries, leap years, explicit billing cycles, unknown eligibility, stale revisions, caps and secret-field rejection. The 10,000-user isolated function simulation additionally checks wallet isolation, fee overrides, repeat writes, stale periods and removal. API smoke testing uses a separate mock user and removes test ownership afterward.
