# Customflows

A **Customflow** is a member's own version of a flow they didn't write. It points at a **source** and
holds only what the member **changed**. The source stays exactly as written for everyone else; wherever the
source is shown or run for that member, their changes are applied on top.

## Three layers

What a member sees in a flow is built from three layers. Each field (a set's weight, reps, duration, rest,
the order) is decided on its own, by the most specific layer that has a value for it:

| Layer | What it is | Set by | Changes on its own |
|---|---|---|---|
| 1. Default | The flow as Qram or the community author wrote it | The author | When the author updates the flow |
| 2. Personalised | Weights from the member's numbers: their history on that exercise first, then the estimate from their strength profile (body weight and lifts they know) | The app, for every flow | Yes, with every set the member logs |
| 3. Custom | What the member changed in this flow: a **Customflow** | The member, on purpose | Never |

- **A field the member touched is never overridden.** Default and Personalised fill only what Custom leaves empty.
- Personalisation is not a Customflow. It's one profile applied to every flow at the moment it's shown or run;
  giving a weight or a lift doesn't create Customflows. A priority-area finisher is part of this layer:
  it is added when the flow trains a nearby muscle, and a Customflow can still reorder it, swap it, or leave it out.
- Clearing a custom field hands it back to Personalised (or Default). Clearing them all deletes the Customflow.
- Setup lives at the top of the Qram tab ("Personalise your flows"), and under Your strength on the profile.

## Sources


| Source kind | What it is | Items are keyed by | Versioned |
|---|---|---|---|
| `qram-flow` | A Qram exercise flow (gym flows) | exercise id | no |
| `qram-session` | A Qram training session | block id | no |
| `community-flow` | A published community flow (not wired into the app yet) | card id | yes |

Sources live in `customflowSources` in `shared/customflows.ts`. A versioned source records the version that
was customised, so the app can tell the member when the original has moved on (`sourceMovedOn`).

## Changes

| Change | Field | Status |
|---|---|---|
| Reorder the items | `changes.order` | Live: drag the ≡ handle on a flow or session page |
| Leave an item out | `changes.removed` | Live. Drops that item, including a priority finisher. `out: false` puts it back |
| Swap an exercise | `changes.swaps` | Live: on a flow page, before Start, each exercise shows its equipment and Swap (or Undo). The result is the member's Custom flow. During a workout, a quiet Swap only, on an exercise not yet begun. Never a prompt once the workout has started. On a session the key is the block id |
| Own set targets | `changes.sets` | Planned |

Every change is optional, so older Customflows stay valid as new kinds are added. Items a change doesn't
mention (for example, a block added to the session later) keep the source order, at the end.

## Rules

- **One Customflow per member per source.** Stored in `customflows` (migration `042_customflows.sql`), keyed by
  member, source kind and source id. Private to the member.
- **No empty Customflows.** Clearing the last change, or dragging back to the original order, deletes it, and
  the member is back on the original.
- **Runs follow the Customflow.** The server starts a run from the Customflow (`resolveRunnable` in
  `src/lib/flow-run-store.ts`) and the run screen previews the same order. A run already in progress keeps its
  own cards; sets are logged per exercise or block, so history never depends on the order.
- **The original is one tap away.** A customised page says "Customised". When the order changed, it also
  says "Customflow: you changed the order" with "Back to the original". A swapped exercise says
  "Swapped from {original}" with Undo.
- **A swap keeps the slot.** Sets, reps, scheme, superset label and place stay. Rest stays only when the
  item set its own `restSeconds`; otherwise the replacement's rest class is used. The weight comes from
  the replacement's own history and estimates, never from the exercise it replaced.
- **A superset travels with its items.** The label stays on the item. Neighbours that still share it,
  including when the two swap places, still alternate. If a reorder puts something between them, both run
  as straight sets and the flow page says "Superset A split by your order", with Undo order.
- **A set already ticked is left alone.** During a workout the Swap control is only on an exercise with no ticked sets. A swap saved after that is for the next start. The sets already ticked stay on the exercise they started as.

## Code

- `shared/customflows.ts`: types, sources, `applyCustomflow`, `hasChanges`, `sourceMovedOn`. `removed` drops an item.
- `shared/priority-finisher.ts`: the priority finisher, applied before the Customflow.
- `shared/item-order.ts`: ordering helpers (`applyOrder`, `moveItem`, `isCustomOrder`).
- `src/lib/customflow-store.ts` and `GET/POST /api/mobile/customflows`: read, `order`, `swap`, `remove`, `reset`.
- `mobile/src/customflows.ts`: cached Customflows, `useCustomflow`, `saveCustomflowOrder`, `saveCustomflowSwap`, `saveCustomflowRemoval`, `resetCustomflow`.
- `shared/exercise-alternatives.ts`: `alternativesFor`, the suggested stand-ins for a missing piece of equipment.
- `mobile/src/DragList.tsx`: the ≡ drag list.

## Following

A member can try someone else's Custom flow for a few sessions and come back to their own with nothing to tidy up. The same sheet follows a shared Daily flow for one day. A shared Map flow is copied into a free slot.

The sheet asks three questions. Each one already has an answer:

1. **Where.** Replace the flow in the followed Map flow that trains the same areas, or add a day. If nothing trains the same areas, the answer is add a day, and the reason says so.
2. **For how long.** 1 session, 4 sessions, or until they stop. 4 is the one already chosen. A Daily flow is one day.
3. **Then.** Go back to their own flow, or keep it. Going back is the one already chosen.

The sheet shows the predicted figure before and after. After Continue, the result lists the dates. **Stop following** stays on the Daily flow for as long as the trial is on.

Their own series is paused. It is never deleted. Each finished session counts one down. At zero the pause lifts by itself, and the weekly review says the flow is back. Keeping it writes a Custom flow with "from q_name" and leaves the original series in place.

What they run is a snapshot of the owner's flow: exercises, sets, reps and order. Weights, body weight and logs do not cross. The person running it gets their own weights from the Personalised layer. Changing the snapshot makes it their Custom flow and keeps "from q_name".

Stored in `flow_follows` (migration `049_flow_follows.sql`). `shared/follow.ts` plans the series changes. `src/lib/follow-store.ts` and `GET/POST /api/mobile/follows` start, stop and count down, in demo mode and in Postgres.

## Adding a change kind

1. Add an optional field to `CustomflowChanges` and handle it in `hasChanges` and `applyCustomflow`.
2. Add an action to `customflowActionSchema` and apply it in `changeCustomflow`.
3. Add a save helper in `mobile/src/customflows.ts` and the control on the page.
4. Test it in `tests/customflows.test.ts`.
