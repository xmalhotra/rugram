# Map flow

A Map flow is a regime: Daily flows repeating in a pattern, with a stated style. It is not a week and it is not seven items. Its picture is its predicted Body flow, one full pass of the pattern (`planFromMapFlow` into `predictBodyFlow`).

A member has five slots. Slot 1 is the base. One Map flow is followed at a time, from a date. Past dates keep the follow that was in force then, and they keep what was done.

Home → Yours shows that followed figure at the top, then Today, then the five cards. Opening the followed card lists its Daily flows in pattern order. Opening another compares the two predicted figures and the two styles, then offers follow from today or from tomorrow. After the choice, the next few days of the new regime are on screen. An empty slot adds a ready Map flow or a copy of one the member already has. Back to base is there whenever the followed Map flow is not slot 1.

## Tables

Migration `048_map_flows.sql` is safe to run twice.

- `map_flows`: owner, slot 1–5 (unique per owner), name, style, purposes, repeat (`in-turn` or `weekdays`), source kind (`template`, `copy`, or `backfill`) and source id, released misses, timestamps.
- `map_flow_days`: the Daily flows in pattern order. Each has a name, an effort, its flows, and its items. A rest day is a Daily flow too.
- `map_flow_follows`: owner, Map flow, and the date the follow starts.
- `member_daily_items`: the lifestyle items on that Map flow. No ticks, no weights, no logs. The phone still keeps the member's own daily checks on the device.
- `flow_series.map_flow_id`: the series belong to a Map flow. Deleting the Map flow deletes those series.

A member who already has series gets slot 1 named **Base**, style `member` ("Your mix"), repeat in turn, source `backfill`. Their series stay on that Map flow, one day each, in the order they were created. The calendar for a backfilled Base still uses each series' own repeat, so a daily series stays daily. A template or a copy uses the pattern instead: those series are stored once, and the day on the calendar comes from `dailyFlowOn`.

## How a pattern repeats

`dailyFlowOn` in `shared/map-flow.ts` picks the Daily flow for a date.

**In turn** is the default. The pattern can be any length. The next Daily flow is the first one not yet done. A rest day advances on its own. A missed training day stays the next one, so later days shift and nothing is skipped.

**Pinned to weekdays** is only a seven-day pattern. Monday is the first day. A missed training day is offered again on the next rest day (the oldest open miss). The member can let that miss go (`let-go`, stored on the Map flow as the day index and the date it was missed). An easy day is not a rest day. A miss is never dropped on its own.

`followedMapFlow` is the latest follow on or before the date. If there is none, it is slot 1, from the day that Map flow was created.

`plannedByNow` is every Daily flow the pattern planned from the follow date through a date. That is what "missed" compares against: planned before today, not done, and not let go. The list includes each Map flow's `doneDates` so the phone can make that comparison. Body flow uses `areasPlannedByNow` on the followed Map flow. Until that list has loaded, the screen still uses open rows from the calendar. Series reads for a date return the Daily flow of the Map flow followed on that date.

## Slots and copying

Creating a Map flow takes the lowest free slot, or a slot the member names. A sixth Map flow is refused. Slot 1 cannot be cleared while it is the only one. Clearing a slot removes that Map flow and the series on it.

`copyMapFlow` makes a new Map flow with the same pattern and style, and new series and items. Weights, logs, and ticks stay behind. Copying another member's Map flow is not this step.

## API

`GET` and `POST /api/mobile/map-flows`, signed in the same way as the series route. `GET` takes an optional `date`. The body lists the five-slot count, which Map flow is followed on that date, the follows, and each Map flow with its style name, predicted figure, items, and `doneDates` (every date, up to the requested date, on which a flow on that Map flow was finished, including finishes from before the Map flow was saved).

`POST` actions: `create` from a template id, `copy` from one of the member's Map flows, `rename`, `clear` a slot, `follow` from a date, `base` from a date, and `let-go` of one missed weekday. Each returns the list.

## Styles

Styles live in `shared/map-flow-styles.ts`. `styleProblems` checks a pattern against the style's rules. The ready Map flows in `shared/map-flow-templates.ts` are checked the same way, including at load.

| Style | What the rules ask |
|---|---|
| Single body-part days | A rest or easy day, and the next day does not work the same body region. |
| Full body | A rest or easy day, and two training days are not next to each other, including around the loop. |
| Straight sets | A rest or easy day, and a training day does not pair exercises. |
| Supersets | A rest or easy day, and each training day pairs exercises. |
| Hybrid | A rest or easy day. Heavy lower-body work and a hard run are on different days, and a rest day, an easy day, or an upper-body day sits on the shorter path between them. |
| Calisthenics | A rest or easy day. |
| Your mix | No spacing rules. This is the backfilled Base, so existing series are not labelled as a training style. |

Heavy lower-body work means a heavy compound whose main muscles include quads, hamstrings, or glutes, on a barbell, Smith machine, or trap bar.

The hybrid hard-run day uses the flow id `running`. That flow is the easy "Start moving" walk in the catalogue. There is no separate hard-run session yet. The day is still tagged as a hard run so the spacing rule can keep it apart from heavy lower-body work. `gym-splits-strength-conditioning` includes a barbell squat, so that day is tagged heavy lower, not a run.

## Where the rules come from

These papers were read for the claims below. Their wording is not copied.

- [ACSM position stand, 2009](https://pubmed.ncbi.nlm.nih.gov/19204579/). For healthy adults, the stand's frequency is 2–3 days a week for novices, 3–4 for intermediates, and 4–5 for advanced lifters, so a pattern is not hard work every day. The same stand rests between sets of one exercise before the next, which is the straight-sets rule. It does not state a universal 48-hour gap.
- [Wilson and others, 2012](https://pubmed.ncbi.nlm.nih.gov/22002517/). Running done with lifting reduced hypertrophy and strength; cycling did not. The difference they report between same-day and separate-day training was not significant, so this rule does not claim that separate days beat same-day training. It only keeps a hard run off the heavy lower-body day.
- [Robineau and others, 2016](https://pubmed.ncbi.nlm.nih.gov/25546450/). 24 hours between strength and aerobic work beat doing them with no gap. That is the buffer day on the hybrid style.
- [NSCA Personal Training Quarterly, 2023](https://www.nsca.com/contentassets/fb8a7be6eb174934bb8844703c4de4cc/ptq-10.1.3-how-to-manipulate-rest-intervals-to-maixmize-strength-training-effectiveness.pdf). Pairing two exercises back to back is a superset. That is the paired-sets rule.

## Ready Map flows

Eighteen templates: each of the six purposes at Beginner, Intermediate, and Advanced. Between them the styles are body-part, supersets, straight sets, full body, calisthenics, and hybrid, and the patterns include three, five, and seven days. They reuse the written Daily flows for that purpose. `offeredPurposes()` offers a purpose only when one of these templates serves it.

Move-better days also carry bird-dog, bear crawl, and inchworm on the day, because the animal-movement flow has no gym sets and the predicted figure would otherwise stay empty. Those three are the planned items for that day, not a log.
