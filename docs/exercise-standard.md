# The exercise standard

Every exercise that appears in a flow or a session must have every part below before that flow counts as complete. All of it is data, not code: adding an exercise never needs a branch on its id.

| # | Part | Where it lives | What "done" means |
|---|------|----------------|-------------------|
| 1 | **Loop**: the moving picture | `mobile/assets/howto/<id>-<n>.jpg`, registered into `mobile/src/how-to-frames.ts` | 2–3 frames showing the key positions. Same man, camera, scale and floor line in each frame, so only the moving limbs change. Background #0A0B0B; mint marks only the main muscles. A reviewer has looked at each frame. |
| 2 | **Icon** | `mobile/assets/exercises/<id>.jpg`, in `mobile/src/exercise-icons.ts` | Used in lists and as the fallback when there is no loop. |
| 3 | **ⓘ How to do it** | `exercise_how_to` table (seed: `shared/exercise-how-to.ts`) | 2–5 steps of at most 90 characters, "Feel it in", "Common mistake", an optional safety note, and `status: 'live'`. Plain words, no medical claims. |
| 4 | **▶ Video** | `videoUrl` on the how-to row | A YouTube link a person has watched and approved. Until then the button searches YouTube for "<name> exercise proper form". |
| 5 | **Set records** | `exercise_logs` (migration 040) | Each set stores done or skipped, the planned and actual numbers, the scheme, start and finish times, and whether it was edited. Already built into the run screen; nothing per exercise. |
| 6 | **Rest records** | same rows | Planned rest, actual rest, and changes made with the − / + steppers. Already built; nothing per exercise. |
| 7 | **Focus area** | `exerciseMuscles` in `shared/muscle-map.ts` | Main and helper areas, shown on the body map under the sets. |
| 8 | **Used in** | Worked out from the flows and sessions | Each exercise knows which flows and sessions use it. This is derived, never typed in by hand. |

Parts 5 and 6 come with the run screen. Parts 1–4 and 7 are per exercise and are the ones the coverage check reports.

## Run screen order (top to bottom)

1. The loop in a square, with ⓘ at its top right and ▶ below it.
2. One quiet line for the plan, such as "3 planned". Sets already done, then exactly one next row. No empty rows for sets not done.
3. Tap a number and that row is highlighted. A wheel opens inline under the row. The rest of the screen stays visible.
4. After a set is logged, a small rest count sits on the next row, with its reason. "harder" adds 30 seconds and "easier" takes 30 seconds off. The count never blocks the next row.
5. Focus area: the body map, "Main: …" and "Helps: …".
6. The fixed glass footer: the workout timer, "Exercise n of total", Skip only when nothing is ticked, Next, Pause. Next is available after any number of sets.

## Checking it

`npm run exercise:coverage` lists every exercise in a flow or session with the parts it is missing. A test fails if a flow marked complete has a missing part.
