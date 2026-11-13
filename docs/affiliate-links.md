# Seller prices and affiliate links

Picks show seller-specific outbound rows, not a global headline price. Prices
belong to the exact seller/variant record. The arrow ↗ and accessibility label
indicate leaving BetterHabits. Links open through the operating system, not an
embedded shopping WebView; app-vs-browser routing depends on installed apps and
device settings. No checkout or purchase confirmation is handled by BetterHabits.

## What is implemented

Each purchase option has a canonical `url`, an optional `affiliateUrl`, its own
price/check date, and an optional commercial disclosure. If supplied, the
affiliate URL is opened unchanged; otherwise the canonical URL opens. Tracking
parameters are never generated from a user ID, phone number or profile.

The API requires a commercial disclosure when an affiliate URL or recognised
tracking tag is present. URLs must use public HTTPS and resolve to the same
recognised merchant family as the canonical link. Amazon's recognised short-link
domains are labelled Amazon, not advertised as separate shops. This validation
does not verify programme membership, the final short-link destination, product
variant, account ownership, conversion attribution or commission eligibility.

Edit these fields in Admin → Content → Picks → Purchase options. Creator
submissions also support them but still require admin review. Only publish links
you are authorised to use. Test/draft products do not provide shopping links.

## Amazon India: approval is a release gate

The [Associates programme](https://affiliate-program.amazon.in/) accepts qualifying
publishers. Native apps require a separate approval process; an Expo prototype
is not evidence of approval. Review the
[mobile-app guidance](https://affiliate-program.amazon.in/help/node/topic/GFP8AD2UDZDQTJPP)
and obtain the applicable mobile approval/amendment before adding monetised links.

Amazon's [linking rules](https://affiliate-program.amazon.in/help/operating/linking)
restrict display of pricing/availability to permitted Amazon-served or authorised
API data. This app currently has no such integration, so Amazon rows deliberately
show **Check price ↗**, even when a manual historical number exists internally.
Manual Amazon offers, shipping totals and price snapshots are not rendered in
the merchant detail section. Do not put manual Amazon prices in free-text content
to bypass this restriction. Future API integration must implement applicable data
freshness, comparison, licensing and disclosure requirements before showing prices.

Use the assigned mobile tracking ID and the platform's approved linking tools.
After approval, include the required site identification from the
[operating agreement](https://affiliate-program.amazon.in/help/operating/agreement),
as well as clear per-link commercial disclosures. No API credentials belong in
the mobile bundle. Affiliate IDs, approved links, provider credentials and an
Amazon price-data integration have **not** been configured by this change.

## Flipkart

Flipkart has an [affiliate programme](https://affiliate.flipkart.com/) and
[API documentation](https://affiliate.flipkart.com/api-docs/af_register.html).
As checked on 16 October 2026, the public registration page did not expose an
actionable new-publisher application in the fetched content. This does not prove
enrolment is closed or open. Confirm current publisher onboarding, mobile-app
permission and link-generation access with Flipkart before planning monetisation.
Do not invent an `affid` or assume a normal product URL earns commission.

Ordinary merchant prices remain dated records, not live price or stock claims.
Affiliate revenue never determines the editorial shortlist rank.
