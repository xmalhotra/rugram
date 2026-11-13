# 11 · Posts with a flow attached

Read `README.md` in this folder first. Vision: `docs/vision.md`, section 3F. Needs `10`.

## Goal

A member can post a Custom flow, a Daily flow or a Map flow as an attachment, add words if they want, and
others can follow it from the post. **Sharing is earned by doing**: only something the member has
genuinely followed can be posted, and posting starts from Home → Yours only. A flow that came with the
app and was never done cannot be posted. Posts made by finishing a workout stay as they are.

## Read

`mobile/src/CommunityFeed.tsx`, `shared/community-flows.ts`, `shared/home-feed.ts`, `shared/sharing.ts`,
`shared/moderation.ts`, `shared/follow.ts`, `shared/map-flow.ts`, `docs/home-feed.md`, `docs/moderation.md`,
and the store and route that create posts today (find them from the feed code).

## Build

1. Migration `050` and schema: a post may carry one attachment (`custom-flow`, `daily-flow`, `map-flow`)
   stored as a snapshot with its owner. The snapshot holds exercises, sets, reps, items and amounts.
   A test proves it never holds weights, body weight or logs.
2. **What can be shared**, as a pure rule in `shared/share-eligibility.ts` with the thresholds in one
   data table: a flow or Custom flow finished once; a Daily flow followed for a day; a Map flow's full
   pattern completed once. Keep them low: the point is honesty, not a hurdle. It reads finished sessions only. The server enforces it; the app only shows it.
3. **Composing, from Home → Yours only.** Yours gets a "Share" section listing what the member has
   earned, and what is close with how far there is to go ("1 more session"). Choosing one opens a composer
   with the attachment card in place and an optional text field. Text goes through existing moderation.
   There is no Share button on a Custom flow's page, a flow's page, or the catalogue; remove any that exist.
4. **The card** in the feed and on the post: the predicted Body flow figure, name, style, level, minutes,
   owner, how long they have followed it, and **Follow**. Follow opens the sheet from `10`; for a Map flow it copies into a free slot, or asks
   which slot to replace when all five are full (never slot 1 without a clear warning).
5. **A post others can act on.** Opening the card shows the whole flow. Under it: **remarks**. Any signed-in
   member can write one (a question, a thought, how it went). The author of the shared flow can delete
   any remark under their post; a member can delete their own. The server checks both. A deleted remark
   is gone for everyone and leaves no placeholder. Remarks go through moderation, and reporting and
   blocking apply to them. The post shows how many
   follow it and how many finished it. Reuse the existing question and reply pieces if the feed or
   events already have them (`shared/event-questions.ts` is the nearest pattern).
6. **Updates**: a shared copy is a snapshot. When the owner changes theirs, followers are offered the
   update with what changed; nothing is pushed.
7. No private numbers are shown anywhere on the post.
8. Reporting and blocking work on these posts exactly as on others.

## Tests

Eligibility at, below and above each threshold; anyone can remark; the author can delete any remark,
another member cannot delete someone else's; the server refuses an unearned post; snapshot privacy;
follow from a post; full slots; update offer; moderation path; feed ordering with both
kinds of post.

## Done when

The checks pass and `docs/home-feed.md` describes attachment posts.
