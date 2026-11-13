# India card and platform-offer collection

Checked 16 October 2026. This is an **incomplete research collection**, not a certified list of every Indian card open for new applications.

## What is implemented

Consumer Picks → Credit cards now starts with the smaller reviewed-card showcase and My Cards. The incomplete Cards / Platform offers / Coverage research is no longer the consumer landing experience. The research records remain editable in Admin; they must be verified before promotion into the reviewed catalogue. Unknown fees are null, never invented as zero/lifetime-free.

The initial snapshot contains 300 directory/sitemap-listed products from 13 issuer sources, within an audit register of 30 issuer sources. It includes historical names, distinct products and some family-level entries; it is **not 300 confirmed currently issuable cards**. Network variants and co-brands still need reconciliation. Some American Express products are charge cards, not revolving credit cards. Its official India catalogue currently states new applications are temporarily paused, and those records are marked paused.

The 33-platform target register includes every user-requested platform, plus Zepto, Myntra, AJIO, Nykaa, Cleartrip, Yatra, EaseMyTrip, IRCTC, redBus, Apollo 24|7, Netmeds, Urban Company, Croma, Reliance Digital, Paytm, PhonePe and Amazon Pay. A target is not evidence that an offer exists.

Fifteen initial offer/benefit leads cover eight platform IDs: Amazon, Flipkart, Blinkit, BigBasket, Zomato, Swiggy, Instamart and MakeMyTrip. One Flipkart promotion is explicitly expired and retained as a historical test fixture. Other offers have partial terms, unresolved programme caps, date conflicts or ongoing-benefit dates that cannot be assumed. They do not enter a new personal recommendation calculation.

## Authoritative sources used

- [SBI official sitemap](https://www.sbicard.com/en/sitemap.page): 75 product links, including bank partnerships and business cards; sitemaps may retain older products.
- [HDFC official catalogue](https://www.hdfc.bank.in/credit-cards), [Axis catalogue](https://www.axisbank.com/retail/cards/credit-card), [IndusInd catalogue](https://www.indusind.com/in/en/personal/cards/credit-card.html), [ICICI catalogue](https://www.icicibank.com/personal-banking/cards/credit-card).
- [Kotak catalogue](https://www.kotak.bank.in/en/personal-banking/cards/credit-cards.html), [American Express catalogue](https://www.americanexpress.com/in/credit-cards/all-cards/), [HSBC catalogue](https://www.hsbc.co.in/credit-cards/), [Standard Chartered catalogue](https://www.sc.com/in/credit-cards/).
- Offer-specific bank URLs are stored on every offer record, including HDFC SmartBuy voucher routes and SBI campaign terms. Headlines are not enough to establish account eligibility.

Blocked, moved, JavaScript-only and unreviewed issuer pages remain in Coverage. A zero count means collection is pending, not that the issuer has no cards. No completeness percentage is computed without a verified denominator. Sources were not bypassed, logged-in offers were not scraped, and no bank credentials, PAN, card number, CVV or OTP were collected.

## Remaining collection work

1. Reconcile the issuer register against the current RBI issuer universe, co-branded issuing entities and issuer mergers. Thirty source targets are not a verified complete RBI denominator.
2. Finish blocked/unreviewed issuers, invitation-only, FD-backed, business/corporate and network-specific variants. Verify product-level application availability; distinguish existing-holder products, new issuance, migration and closures.
3. Verify fees, GST, renewal waivers, base rewards, exclusions and dated terms for each product. Promote a directory entry to reviewed-card data only after this work.
4. Collect current direct-checkout and issuer-specific offers for all platform targets, not just SmartBuy/voucher examples. Login-, BIN-, city-, seller-, basket- and account-targeted offers require permitted access or user-supplied screenshots/terms. Missing data stays unknown.
5. Resolve all partial offer terms, caps, validity, payment routes, eligible networks/cards, coupon requirements, usage limits and stacking. Expired campaigns stay excluded from current value calculations.

## Data and Admin

`shared/card-inventory-snapshot.json` holds source-listed names and coverage metadata. `shared/card-offer-seeds.ts` holds dated source leads. These seed the existing CMS, not a separate static-only UI.

Admin → Content supports **Card issuer**, **Card listing**, **Card platform**, and **Card offer**. Draft, publish, archive, version conflicts, history and restore use the existing authenticated admin workflow. Publishing listings/offers checks referenced issuer/platform IDs. Underlying DB content tables already accept these kinds; no new migration is required. Existing moderation overrides seed content; restarting does not silently overwrite CMS edits.

`scripts/research-card-directory.mjs` is read-only candidate discovery, not an automatic publisher. Its parser can miss names and pick up navigation text, so candidates require editorial review. No scraper output is blindly presented as a current available card.

## Later recommendation model — deliberately not enabled

Input should be a user's **already-planned** spend by platform, frequency and basket size, owned card variants, willingness to use vouchers/portals, eligibility and redemption preference. Do not collect banking credentials.

For each purchase, enumerate eligible payment routes; compute one valid route using verified rates, exclusions, transaction limits, shared statement-cycle/month/campaign caps, voucher/portal fees, EMI interest and fees, and permission to combine benefits. A voucher purchase and its redemption are not two independent earning transactions. Ten-times points is not ten-percent cash. Base reward points already included in a multiplier must not be added again.

Net value = validated eligible savings + explicitly valued redeemable rewards − annual/joining fees and taxes − route/redemption/EMI costs. Apply renewal waivers only to eligible planned spending, never encourage extra spending to hit them. Compare the incremental value versus cards the user already owns, with uncertainty shown separately. One-off sale discounts must not be annualised as recurring benefits. An LLM can explain verified calculations, not invent terms or do authoritative financial arithmetic.
