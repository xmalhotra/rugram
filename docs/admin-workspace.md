# Admin-operated content and the complete demo journey

Admin accounts open a dedicated management screen, not the consumer tabs.
Home, personal flows, shopping discovery, event discovery and the personal
profile are unavailable in the admin navigation. Content, approvals, people,
creator permissions and analytics remain in the management workspace; local
demo simulation is a development-only tool. Log out and use a separate user
account to test the consumer experience. Root navigation guards enforce this
separation for restored sessions and deep links, not just visible tab buttons.

Everyday content changes now use the native Admin workspace. No source-code or
JSON editing is required for supported content types. Programming is still needed
for new application behaviours, native widgets, security rules or integrations;
those are not the same as editing content.

## Content operations

Admin → Content provides searchable, paginated forms for flows, exercises,
credit cards and benefits, focus categories, nutrition paths, learning guides,
Picks, events and app settings. Expand lists to add, remove or reorder entries.
References use stable IDs internally; flow/exercise/guide selectors show titles.

Save draft keeps unfinished work private. Preview is a field preview, not an
emulated user screen. Publish validates the content, references and required
source fields before making it available. Archive hides discovery records while
retaining recorded history. History can restore a recorded revision as a draft.
Optimistic revision checks reject competing stale saves rather than overwriting
another editor's work. Initial seed data remains a fallback until overridden;
operators never need to edit that seed code to change the available content.

App settings manages enabled event cities/country/topics, default creator quota,
product categories/labels, Tech types and price-tier labels. Core identifiers and
supported behaviours remain protected. A newly added category is a general Pick
category, not an automatic new specialist comparison engine.

Admin → People searches registered accounts and edits public profile details,
username, user/creator/admin role and suspension. Suspension blocks authenticated
access; it does not delete history. The acting admin cannot demote or suspend
themselves, and database checks retain an active admin. New people join via OTP;
admins can then grant creator permissions without adding accounts in code.

Admin → Permissions sets per-creator monthly event limits. Admin → Overview
shows aggregate activity. An item's Analytics tab supports 7/30/90 days, recorded
actions, distinct accounts and India-time daily totals. Flow analytics can filter
an individual activity. Attribution begins with this release; old unattributed
logs are not retroactively assigned. Link opens do not imply purchases,
registration, attendance, health outcomes or a recommendation's effectiveness.

## Flow → story → Pick journey

New users start with focus selection. Published flows linked to that focus are
shown, and adding a flow places it on Home. Related editorial story cards,
published related flows, Picks and events produce stories; no content means no
story circle. Viewing each card stores a content fingerprint in the user's
profile. A group turns grey after all current cards have been viewed. Changed or
new content creates a new fingerprint and restores the active ring. Read history
is bounded to 1,000 keys per user and is private to the user.

Picks can contain images, sourced specifications, fit assessments, criteria,
trade-offs and dated public creator references. Creator references distinguish
Uses / Recommends / Mentions, source review, commercial disclosure and context.
Creator submissions cannot set their own reference's verified flag. References
do not prove daily use, scientific efficacy or affiliation with the app.
Alternatives match category, Tech/equipment type and use case; item-price sorting
is not a universal “best” ranking. Missing specs remain unknown. Seller shipping,
offer eligibility, expiry and price-check timestamps remain separate.

Picks now supports explicit editorial shortlists. Edit a product's Assessment,
then Add shortlist: enter its original rank, a comparison group (for example
headphones for running), and the alternative product names considered. The
existing Why chosen, fit, limitations, trade-offs, criteria and dated sources
explain the decision. Ranks are not generated from price tier, celebrity counts,
or completeness of a listing. Creator submissions cannot assign editorial ranks.
Products without this curation remain unranked. Filters retain original ranks;
they never promote number 2 to number 1 or mix unrelated comparison groups.
Demo ranks are labelled simulated. Get it ↗ opens a validated seller option
outside the app; fictional demo products never offer a real purchase action.

The user-supplied YouTube Short is stored as an unreviewed learning reference.
Its transcript and authorship were not accessible for verification, so no claims
are inferred from it. Food Pharmer is identified as user-named inspiration only,
not an app endorser.

## Goal-led Supplements

Picks → Supplements is an educational journey, not the generic shopping filter
screen: goal → topic → context → explicitly linked options. It has no budget
slider, price-tier filter or “More to explore” section. Starter goals are Working
out, Running, HYROX and Recovery. Topics explain protein, creatine, hydration and
label reading without prescribing doses or assuming a purchase is needed.
No protein/creatine brands are invented to fill the current catalogue gaps.

Admin → Content → Settings → Supplement discovery edits goals, illustrations,
topic order, explanations, evidence links, product links and related flows.
Existing settings documents receive the editable starter template on open.
Goal/topic IDs remain stable; invalid topic links and duplicate IDs are rejected.
Only explicitly linked, published, non-demo supplement products appear. Labels
such as pre-workout do not automatically associate a product with every goal.
Default content cites NIH ODS and AIS; ingredient evidence does not certify a
particular brand. The linked hydration products are comparisons, not a claim that
each user needs electrolytes. Prices and seller handoffs appear only after a
topic is chosen. Product/flow loading retains the existing bounded resource cap.

## Events and privacy

Event details use Dev Days | IARE Hyderabad on Luma
(https://luma.com/w36u8e3p) as a public interaction reference, inspected on
16 October 2026: date/venue, compact host rows, registration card, then About.
We inspected its public registration form without submitting anyone's details.
The app does not duplicate Luma's provider-specific form questions, marketing
consent, guest data, branding or private registration state. Native free events
use the signed-in display name and an explicit request confirmation; the host
must then approve the guest. External events hand off to the real provider.
Organiser names/avatars are links with a leave-app confirmation, not separate
full-width “Organizer profile” buttons. Guest names and manager controls expand
on demand. Loading, error/retry, declined, full, closed, cancelled and past states
have distinct messages and no misleading active request button.

Creation uses Basics → Details → Registration → Sources. Creator submissions
remain pending until an admin verifies and publishes them. The monthly limit
counts submissions, including rejected entries, not only approved events.
New event start/end dates must be no later than the next calendar year; historical
records can still be corrected by admins.

Two registration modes are supported:

- External: source links open Luma, Meetup or the organiser. Registrations,
  approvals, guest identities and cancellations stay there. The app has no
  provider account connection, attendee import or confirmed attendance count.
- In-app approval: currently free events only, with named organisers and a guest
  capacity. Requests are pending until the owning creator or an admin approves
  them. Only approved guests and managers see approved names. Cancellation
  withdraws the request/place, releases capacity and removes roster access.
  A cancelled registration cannot be silently approved; the guest must request
  again. Managers see up to 100 requests and guests, with the full approved count.

Guest approval uses an event-row lock and a fresh READ COMMITTED statement to
enforce capacity under concurrent requests. Guest displays omit phone, email,
payment data and unrelated account details. This is inspired by Luma's documented
approval workflow, not a Luma API integration or pixel-identical clone.

## Try the populated local demo

Admin → Simulation runs the complete scenario once per backend process and
shows its checks. It creates 12 clearly labelled fictional free events, two
fictional Picks, an editable focus and flow, and four test accounts. Existing real
catalog records and the current admin's personal profile are not replaced.

| Mock phone | Scenario |
| --- | --- |
| +12025550201 | User with a flow, new story update and approved event registration |
| +12025550202 | Creator who owns the first two events and manages requests |
| +12025550203 | Another approved attendee |
| +12025550204 | Pending attendee; roster must stay hidden |

Log out, enter a test phone and use the code shown in Mock SMS. The normal admin
fixture remains +12025550103. These are fictional development numbers; no SMS,
ticket booking, payment, celebrity endorsement or real event is created.
The demo creator has used its two monthly submissions to demonstrate the limit.
For hands-on creation, raise `demo-0202`'s allowance in Admin → Permissions or
use the original creator fixture (+12025550102).

## Storage, deployment and evidence

Local demo data remains in process memory and resets when the backend restarts.
Persistent deployments require the configured PostgreSQL backend and migrations
011 (content/audits/analytics/account suspension) and 012 (event registrations),
in addition to the existing migrations. Apply with `npm run db:migrate` during
deployment. Demo simulation is disabled in production/database mode. Production
phone identity and real SMS authentication are still separate release gates.

Checks: `npm run test:admin-content`, `npm run test:demo-journey`, unit tests,
type checks, lint, the 10,000-profile in-memory simulation and iOS export.
`npm run test:creator-quota-db` uses only the isolated quota_test database at
127.0.0.1:55433; it also checks CMS persistence, private story reads, a 10-way race
for one approved event place, cancellation and roster-access revocation.
These do not certify cloud load, physical-iPhone rendering or production launch.
