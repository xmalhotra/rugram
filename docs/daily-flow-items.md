# Daily flow items

What Qram will write into a Daily flow, and what stays in the catalogue only. The records live in `shared/daily-flow-item-data.ts` and `shared/purposes.ts`. A new purpose or a new item is a new record. The functions do not name them.

## The bar

An item is written into a Daily flow only when all of these are true.

1. It can change the outcome of a purpose Qram already writes a day for.
2. The amount is the dose a position stand states, including a range when the stand states a range. The words are what the flow contains ("5 g", "20–40 g").
3. The source is that position stand, linked. A brand page, a blog, or a claim the stand does not make does not qualify.
4. The first stage of a day has at most three items.

Left out:

- **Hygiene.** Water, steps, and ordinary self-care do not change the training outcome. The ids are `hygieneSeedIds` in `shared/daily-flow-bar.ts`: water, warm water, fill a water bottle, steps, brush teeth, floss, shower, make the bed, wash face, simple skincare. The seed has no row named Steps. The id is listed so a later row is flagged.
- **No source.** A catalogue row with no linked position stand cannot be written in. `seedItemsOutsideBar` flags it. The row stays in the catalogue.
- **A dose that is not one amount for everyone.** Caffeine is 3–6 mg per kg of body mass, about 60 minutes before exercise, and people differ in sleep and tolerance ([ISSN position stand, Guest and others, 2021](https://jissn.biomedcentral.com/articles/10.1186/s12970-020-00383-4)). Iron and vitamin D need a clinical reason, not a training goal ([NIH ODS iron](https://ods.od.nih.gov/factsheets/Iron-Consumer/), [NIH ODS vitamin D](https://ods.od.nih.gov/factsheets/VitaminD-Consumer/)).
- **A claim the source does not make.** No fat-burner for visible abs. Creatine on a HYROX day is for strength, not a finish time. Magnesium is not written in for sleep: the sleep evidence is not a dose this flow states.

Evidence grade: an ISSN position stand (a consensus review the society publishes). The link is the journal article. Nothing here is a paid licence, and nothing is copied from another site's wording.

## What the seed would drop

`seedItemsOutsideBar` reads the existing routine catalogue and flags rows. It does not delete them. Of the 558 catalogue rows:

- 9 are hygiene: warm water, water, brush teeth, fill a water bottle, floss, make the bed, shower, simple skincare, wash face. There is no Steps row to flag.
- 547 have no linked position stand, so they stay out of a written day. That includes whey, fish oil, and vitamin D.
- 2 stay eligible: `creatine` and `beta-alanine`, because the written items of those ids carry a position stand. The seed lines themselves are unchanged.

Flagged rows can still be browsed. They are not written into a day.

## The items that are written

### Creatine · 5 g · once a day

[ISSN position stand, Kreider and others, 2017](https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0173-z). After muscle creatine stores are saturated, the stand says they can generally be maintained with 3–5 g a day of creatine monohydrate. Five grams is the top of that range. It is not the loading pattern the same paper describes (about 5 g four times a day for 5–7 days). The flow does not load.

The stand links creatine to high-intensity work, strength, and lean mass gained with training. On Gain muscle and Get stronger the line is Strength and Muscle size. On HYROX the line is Strength only. The stand does not give a HYROX finish time, and this item does not claim one.

Timing in the stand is a daily intake, not a clock time. The flow says once a day, in the morning, including on days without a session.

Picks category: `creatine`. The brands are the catalogue shortlist. See below.

### Protein · 20–40 g · with a meal

[ISSN position stand, Jäger and others, 2017](https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8). For building and keeping muscle the stand gives about 1.4–2.0 g of protein per kg of body weight a day. Per meal it gives 0.25 g per kg, or an absolute dose of 20–40 g. The flow uses that per-meal range. It does not calculate a body-weight target.

The stand says whole foods should be the first source, and a supplement is a practical way to fill a gap. The item is the meal. A powder is the picks list for when meals do not cover it.

On Visible abs the same item is there so muscle is kept while someone eats less. The stand's note on higher intakes in a hypocaloric period is about keeping lean mass. It is not a fat-burner, and this flow sets no calorie target.

Gain muscle and Get stronger add it at week 3, as a proposal. Visible abs has it from week 1, because the purpose's question is about eating less.

Picks category: `protein` (the catalogue's whey shortlist).

### Beta-alanine · 4–6 g, split through the day

[ISSN position stand, Trexler and others, 2015](https://jissn.biomedcentral.com/articles/10.1186/s12970-015-0090-y). The stand says 4–6 g a day for at least 2–4 weeks, in divided doses of about 2 g or less, raises muscle carnosine. The performance note is for efforts of about 1–4 minutes. The same paper says more research is needed for endurance past 25 minutes. The flow uses the 1–4 minute claim, on the HYROX day from week 3, and does not state a finish time. Tingling is the side effect the stand names. There is no beta-alanine shortlist in the catalogue, so this item has no picks link.

## Purposes

Each purpose has a name, the areas and skills it needs, and the questions it asks. It is offered only when those questions exist, the written days pass the bar, and a ready Map flow serves that purpose. `offeredPurposes()` is that check. With no argument it uses the purposes on the ready Map flows in `shared/map-flow-templates.ts`. Passing an empty list offers nothing.

| Purpose | Written days | Week 1 items | Later |
|---|---|---|---|
| Gain muscle | Upper day (`gym-splits-size-upper`), Lower day (`gym-splits-size-lower`) | Creatine 5 g | Week 3 proposes protein |
| Get stronger | Strength upper (`gym-splits-power-upper`), Strength lower (`gym-splits-power-lower`) | Creatine 5 g | Week 3 proposes protein |
| Visible abs | Core day (`gym-core-dead-bug-and-plank`), Full body day (`gym-full-beginner-day-1`) | Protein 20–40 g | — |
| Move better | Move day (`workout-animal-movements`) | None. No position-stand dose changes mobility. | — |
| Do a handstand | Handstand practice (`cal-upper-intermediate`, the live session that includes a wall handstand) | None. | — |
| Compete in HYROX | Hybrid day (`gym-splits-strength-conditioning`) | Creatine 5 g, for strength | Week 3 proposes beta-alanine |

The named HYROX catalogue sessions are still coming soon, so the written day uses the live strength-and-conditioning session. A member swaps from there.

A demo member has the purpose Gain muscle (the phrase "build muscle" is an alias). An empty today shows the upper day and creatine.

## Picks

See picks opens the catalogue shortlist for that item's category and closes back to the day. The list shows four checks, in this order: tested by a third party, dose per serving, price per dose, sold in India. A check counts only when the product row records it.

On the current creatine and whey rows, a third-party test and a dose per serving are not recorded. Pack price is on the row and is shown as a pack price. It is not turned into a price per dose. "Sold in India" counts when the catalogue URL is an India address (a host ending in `.in`, or starting with `in.`). A `.com` shop stays "not recorded". That is why NAKPRO creatine, whose listing host is `nakpro.com`, ranks after the India-address shops. The shortlist order breaks ties. Nothing is paid, and a payment is not a score.

A saved or bought pick from that list is named on the item. Bought is read when the profile has `boughtProductIds`. The profile already stores saved picks.

## Changes over time

Week 1 is the written day. A later stage is a proposal in the weekly review, with the reason stored on that stage. It is added to the day only when the member leaves it on and taps Add to your day. Turning it off leaves the day as it was.
