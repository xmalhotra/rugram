# Connected Flows: habits → Picks → events

The HYROX starter flow now includes a pre-training drink habit. Its `pickContext`
points to the `pre-workout-drink` use case in the central product library.
Related cards use the same product IDs, source links, prices, details and save
action as Picks. A budget filters these options by pack price. Product details
offer a back-to-flow action; saving a pick returns to the flow. Buying a product
is not required, and water is explicitly an alternative without a supplement
purchase. No clinical efficacy, creator backing, or HYROX endorsement is implied.

Flow `eventContext` connects it to published HYROX events with country `IN`,
across cities rather than only the profile city. Upcoming events appear below
the habits with date ranges, venue, registration status, fee information and
source-check date. Unknown fees are not represented as free, and upcoming
announcements are not represented as open registration.

The API returns bounded `flowResources` independently of the paginated/city
feed: up to 100 matching products and 100 matching events. These are references
to central catalog records, not separately generated recommendations. Only
published records are included. This currently adds two bounded database
queries to bootstrap in database mode; a new hosted load test has not been run.

## Source snapshot — 15 October 2026

- Fast&Up Reload Orange: 20-tablet tube listed at ₹249:
  https://in.fastandup.com/products/reload-single-tube-orange
- Fast&Up Reload Berry: 20-tablet tube listed at ₹265:
  https://in.fastandup.com/products/reload-single-tube-berry-flavour
- HYROX Gujarat: organiser page lists 26–28 November 2026, Gandhinagar:
  https://hyrox.co.in/event/hyrox-gujarat/
  Ticket link: https://india.hyrox.co.in/event/hyrox-gujarat-season-26-27-8yjjhs
  Publicly readable ticket content did not expose an entry price; no cost is
  invented. A registration link does not guarantee tickets for every division.
- HYROX Noida: 15–17 January 2027, with tickets advertised as coming soon:
  https://hyrox.co.in/event/hyrox-noida/
- General hydration context, separate from supplier marketing:
  https://www.nhs.uk/Live-well/eat-well/food-guidelines-and-food-labels/water-drinks-nutrition/

The two drink listings are flavours of the same supplier product, not two
independently proven benefits or a comprehensive brand ranking. Prices are
seller snapshots, not live checkout totals; shipping or other fees may apply.
No manufacturer safety/performance marketing claims are adopted as medical facts.
The Bengaluru race is not seeded because official content reviewed contained
conflicting May 2027 dates; it needs confirmation before adding a definitive date.

## Central catalog and editing

Local demo mode adds these four source-linked records without replacing existing
moderation decisions or resetting profiles/sessions. In database mode, after
normal migrations, run `npm run db:seed-flow-resources` against the intended
development database. It inserts missing stable IDs only; existing records are
not overwritten. No database seed was executed during this local-demo update.

Creators/admins can associate product submissions with a habit use case. Event
link forms include country, registration status and optional published entry
fee. Leaving the fee blank means unverified, not zero. Imports, live price sync,
automatic event refresh, personalised nutrition and a race coaching programme
are not implemented. Existing saved step IDs remain stable; the new drink step
has its own ID.

Verification covers source-linked catalog shapes, exact habit/use-case matching,
budget filtering, country/topic/status/date filtering, unknown-price handling,
and resource availability across feed pages. The in-memory 10,000-user function
simulation is not a production capacity or device UI certification.
