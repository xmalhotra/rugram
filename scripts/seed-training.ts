import dotenv from 'dotenv';
import { database } from '../src/lib/database';
import { seededSchemes } from '../shared/set-scheme-math';
import { trainingCatalog } from '../shared/training-seed';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? '.env.local', quiet: true });
if (!process.env.DATABASE_URL)
  throw new Error('DATABASE_URL is required. Demo mode already serves the training catalog from memory.');

async function seed() {
  const { types, sessions, plans, howTos } = trainingCatalog();
  const schemes = seededSchemes();
  const sql = database();
  await sql.transaction([
    ...types.map(
      type =>
        sql`INSERT INTO training_types (id, title, about, icon_key, block_fields, session_fields, can_post, uses_exercise_records, status)
          VALUES (${type.id}, ${type.title}, ${type.about}, ${type.iconKey}, ${JSON.stringify(type.blockFields)}::jsonb, ${JSON.stringify(type.sessionFields)}::jsonb, ${type.canPost}, ${type.usesExerciseRecords}, ${type.status})
          ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, about=EXCLUDED.about, icon_key=EXCLUDED.icon_key, block_fields=EXCLUDED.block_fields, session_fields=EXCLUDED.session_fields, can_post=EXCLUDED.can_post, uses_exercise_records=EXCLUDED.uses_exercise_records, status=EXCLUDED.status`,
    ),
    ...sessions.map(
      session =>
        sql`INSERT INTO training_sessions (id, type_id, title, goal, level, note, blocks, status, catalog_tiles)
          VALUES (${session.id}, ${session.typeId}, ${session.title}, ${session.goal}, ${session.level ?? null}, ${session.note ?? null}, ${JSON.stringify(session.blocks)}::jsonb, ${session.status}, ${JSON.stringify(session.catalogTiles ?? [])}::jsonb)
          ON CONFLICT (id) DO UPDATE SET type_id=EXCLUDED.type_id, title=EXCLUDED.title, goal=EXCLUDED.goal, level=EXCLUDED.level, note=EXCLUDED.note, blocks=EXCLUDED.blocks, status=EXCLUDED.status, catalog_tiles=EXCLUDED.catalog_tiles`,
    ),
    ...plans.map(
      plan =>
        sql`INSERT INTO training_plans (id, title, goal, level, weeks, slots, status)
          VALUES (${plan.id}, ${plan.title}, ${plan.goal}, ${plan.level ?? null}, ${plan.weeks}, ${JSON.stringify(plan.slots)}::jsonb, ${plan.status})
          ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, goal=EXCLUDED.goal, level=EXCLUDED.level, weeks=EXCLUDED.weeks, slots=EXCLUDED.slots, status=EXCLUDED.status`,
    ),
    ...schemes.map(
      scheme =>
        sql`INSERT INTO training_set_schemes (id, definition, status)
          VALUES (${scheme.id}, ${JSON.stringify(scheme)}::jsonb, 'live')
          ON CONFLICT (id) DO UPDATE SET definition=EXCLUDED.definition, status=EXCLUDED.status`,
    ),
    ...howTos.map(
      howTo =>
        sql`INSERT INTO exercise_how_to (exercise_id, definition, status)
          VALUES (${howTo.exerciseId}, ${JSON.stringify(howTo)}::jsonb, ${howTo.status})
          ON CONFLICT (exercise_id) DO UPDATE SET definition=EXCLUDED.definition, status=EXCLUDED.status`,
    ),
  ]);
  console.log(`Training seeded: ${types.length} types, ${sessions.length} sessions, ${plans.length} plans, ${schemes.length} schemes, ${howTos.length} how-tos.`);
}

seed().catch(error => {
  console.error(error instanceof Error ? error.message : 'Training seed failed.');
  process.exit(1);
});
