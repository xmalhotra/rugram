# Workout journeys and central exercise library

Home → open an added workout → intended benefits → four-stage journey → preparation → exercise sequence → reflection. Workout discovery starts with **Abs & core foundations**. Previewing does not join a flow; **Add flow** adds it to Home. Only an enrolled user can record sets.

## Reusable model

- `shared/exercises.ts`: eight initial canonical exercises, categories, original technique summaries, easier options, cautions, source links and code-native schematic thumbnails. The illustrations are reminders, not complete technique tutorials or licensed photographs.
- `HabitFlow.workout`: benefits, ordered exercise-ID references, sets, repetitions **or** hold seconds, rest and per-side interpretation. Technique is not copied into flow blocks.
- `shared/workouts.ts`: readiness, stable individual-set step IDs and reflection. One completed per-side set means both sides; hold durations are not described as repetitions. The educational sets × reps calculator never silently changes the workout.
- `mobile/src/WorkoutJourney.tsx`: journey and technique disclosure, set-level check-ins, educational comparison and browsable central library.
- Admin → **Build a workout flow**: select existing exercises, arrange order and choose example dose. Publishing is admin-only at the API as well as in the UI. Creator authoring/moderation and exercise-entry editing are not implemented in this increment.

Replayed publish requests are idempotent per admin/request key. Exercise IDs, measurement modes, duplicate exercises and dose bounds are validated before publishing. Set completion uses the existing authenticated profile API and local-day key; adding a flow is not a workout completion. Editing/deleting published workouts and historical plan versioning are not yet exposed.

## Database deployment

Run `npm run db:migrate`, then `npm run db:seed-exercises` with a configured `DATABASE_URL`. Migration 009 adds canonical exercises, workout metadata and ordered workout/exercise relations, with foreign keys and dose constraints. The seed is transactional and does not replace existing records. Demo mode uses the same eight-entry seed and an in-memory authoring store; restarting clears demo-created flows and profiles.

The initial catalog endpoint is bounded to 500 exercises and 100 database workouts. Catalog pagination, cached reads and larger native virtualized lists are future scaling work. Catalog queries add database work to bootstrap and flow mutations: older HTTP load reports do not certify the new path. This migration and seeding must be verified against the deployment database before release.

## Content and validation limits

The default core dose is an editorial general-adult example, not personalized coaching, rehabilitation or a clinically validated programme. Intended benefits are not promises. No spot-fat-loss claim, guaranteed visible abs, or automatic dose escalation is made. Links to NHS/NASM technique background and ACSM resistance-training guidance provide context; they do not imply endorsement of this app's exact flow. Load/effort and injury screening are not personalized here.

Automated checks cover canonical references, volume semantics, stable completion IDs, discovery, admin role checks, request deduplication, missing exercise/mode rejection, user isolation and set undo. An iOS JavaScript bundle can verify compilation, not physical-device layout, VoiceOver, technique safety or native runtime behavior. Physical-device testing remains required.
