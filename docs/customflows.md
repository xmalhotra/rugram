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
  giving a weight or a lift doesn't create Customflows.
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
| Leave an item out | `changes.removed` | Planned |
| Swap an exercise | `changes.swaps` | Planned |
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
- **The original is one tap away.** A customised page says "Customflow: you changed the order" with
  "Back to the original".

## Code

- `shared/customflows.ts`: types, sources, `applyCustomflow`, `hasChanges`, `sourceMovedOn`.
- `shared/item-order.ts`: ordering helpers (`applyOrder`, `moveItem`, `isCustomOrder`).
- `src/lib/customflow-store.ts` and `GET/POST /api/mobile/customflows`: read, `order`, `reset`.
- `mobile/src/customflows.ts`: cached Customflows, `useCustomflow`, `saveCustomflowOrder`, `resetCustomflow`.
- `mobile/src/DragList.tsx`: the ≡ drag list.

## Adding a change kind

1. Add an optional field to `CustomflowChanges` and handle it in `hasChanges` and `applyCustomflow`.
2. Add an action to `customflowActionSchema` and apply it in `changeCustomflow`.
3. Add a save helper in `mobile/src/customflows.ts` and the control on the page.
4. Test it in `tests/customflows.test.ts`.
