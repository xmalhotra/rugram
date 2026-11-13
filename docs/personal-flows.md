# Personal flows

Every visual card has an **Add to Flow** action in the fixed card heading. It opens a destination picker, without changing the current collection or Tilt/Slider mode.

- First use offers an editable `Flow 1` name. Later defaults choose the next unused number.
- Choose an existing flow, or create another one. The picker marks cards already added and offers name search when there are more than six flows.
- Cards from different collections can share a personal flow. Source collections are not automatically favourited or modified.
- Home shows **Made by you** above saved collections, with a cover, name, count and card-title preview.
- Open a personal flow to use the same frames, global demonstrator choice, per-card Tilt/Slider controls and card navigation. **Edit flow** supports renaming, moving cards up/down and removing cards. Removing a card leaves the source unchanged; it can be added again.

## Persistence and safeguards

`MobileProfile.personalFlows` is optional for backward compatibility. Records hold source/card references and the saved card title, not duplicate media. No database migration is needed: the existing profile JSONB stores the field. Limits: 50 personal flows, 100 cards per flow, 60 characters per name.

Authenticated API actions: `personal-flow-create`, `personal-flow-add`, `personal-flow-rename`, `personal-flow-remove`, `personal-flow-move`. Strict schemas reject owner IDs, arbitrary media or content, invalid references and unsupported fields. Ownership is derived only from the session. Shared canonical cards are deduplicated even when encountered through different collections. Create retries reuse the client-generated flow ID.

Postgres updates compare-and-swap only the `personalFlows` field, retrying conflicts without overwriting unrelated preferences/saves. Demo mode follows the same model but remains process-local memory; it is not durable across server resets. Profile data is included in the existing account export/deletion lifecycle.

Unavailable references remain listed in Edit flow. Index-based legacy cards with a changed title are not silently substituted for a different card. A personal flow with cards counts toward Home onboarding.

## Verification (2026-10-24)

- 396 automated tests passed, including actual component-handler tests for the picker, failed-save retry, duplicate state, current-card targeting, Home opening, editor actions and existing visual-deck reuse.
- `node --conditions=react-server --import tsx scripts/test-personal-flows.ts`: authenticated route checks in isolated in-memory demo fixtures; cross-collection addition, reload, validation and account isolation passed.
- `node --conditions=react-server --import tsx scripts/test-personal-flows-db.ts`: disposable accounts on guarded `betterhabits_local` PostgreSQL; concurrent create/add, unrelated profile-field preservation, rename/reorder/removal, owner checks and export passed. Fixture accounts are removed in `finally`.
- Root/mobile TypeScript checks passed. Targeted lint passed with the two existing unrelated App effect-dependency warnings.
- Native iOS export is a bundling check, not physical-device interaction or gyroscope validation. No simulator toolchain is available on this host; phone layout and gesture verification remain outstanding.
