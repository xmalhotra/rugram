import dotenv from 'dotenv';
import { database } from '../src/lib/database';
import { routineCatalog } from '../shared/routine-seed';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? '.env.local', quiet: true });
if (!process.env.DATABASE_URL)
  throw new Error('DATABASE_URL is required. Demo mode already serves the routine catalog from memory.');

async function seed() {
  const { items, routines } = routineCatalog();
  const sql = database();
  const itemIds = items.map(item => item.id);
  const routineIds = routines.map(routine => routine.id);
  const partKeys = new Set(routines.flatMap(routine => routine.parts.map(part => `${routine.id}|${part.position}|${part.itemId}`)));
  const existingRoutines = await sql`SELECT id, title FROM routines`;
  const existingItems = await sql`SELECT id, name FROM routine_items`;
  const existingParts = await sql`SELECT routine_id, item_id, position FROM routine_parts`;
  const routineIdsLeft = new Set(routineIds);
  const itemIdsLeft = new Set(itemIds);
  const routineTitle = new Map(existingRoutines.map(row => [String(row.id), String(row.title)]));
  const itemName = new Map(existingItems.map(row => [String(row.id), String(row.name)]));
  const removedRoutines = existingRoutines.filter(row => !routineIdsLeft.has(String(row.id))).map(row => String(row.title));
  const removedItems = existingItems.filter(row => !itemIdsLeft.has(String(row.id))).map(row => String(row.name));
  const removedParts = existingParts
    .filter(row => !partKeys.has(`${row.routine_id}|${row.position}|${row.item_id}`))
    .map(row => `${routineTitle.get(String(row.routine_id)) ?? row.routine_id}: ${itemName.get(String(row.item_id)) ?? row.item_id}`);
  await sql.transaction([
    sql`DELETE FROM routine_parts`,
    sql`DELETE FROM routines WHERE NOT (id = ANY(${routineIds}::text[]))`,
    sql`DELETE FROM routine_items WHERE NOT (id = ANY(${itemIds}::text[]))`,
    ...items.map(
      item =>
        sql`INSERT INTO routine_items (id, name, aliases, type, serving) VALUES (${item.id}, ${item.name}, ${item.aliases}::text[], ${item.type}, ${item.serving})
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, aliases = EXCLUDED.aliases, type = EXCLUDED.type, serving = EXCLUDED.serving`,
    ),
    ...routines.map(
      routine =>
        sql`INSERT INTO routines (id, title, aliases, type, main_checkpoint, checkpoints, region, rank)
        VALUES (${routine.id}, ${routine.title}, ${routine.aliases}::text[], ${routine.type}, ${routine.mainCheckpoint}, ${routine.checkpoints}::text[], ${routine.region}, ${routine.rank})
        ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, aliases = EXCLUDED.aliases, type = EXCLUDED.type,
          main_checkpoint = EXCLUDED.main_checkpoint, checkpoints = EXCLUDED.checkpoints, region = EXCLUDED.region, rank = EXCLUDED.rank`,
    ),
    ...routines.flatMap(routine =>
      routine.parts.map(
        part =>
          sql`INSERT INTO routine_parts (routine_id, item_id, amount, position)
          VALUES (${routine.id}, ${part.itemId}, ${part.amount}, ${part.position})`,
      ),
    ),
  ]);
  console.log(`Routines seeded: ${items.length} items, ${routines.length} routines.`);
  console.log(`Removed ${removedRoutines.length} routines${removedRoutines.length ? `: ${removedRoutines.join(', ')}` : '.'}`);
  console.log(`Removed ${removedItems.length} items${removedItems.length ? `: ${removedItems.join(', ')}` : '.'}`);
  console.log(`Removed ${removedParts.length} parts${removedParts.length ? `: ${removedParts.join(', ')}` : '.'}`);
}

seed().catch(error => {
  console.error(error instanceof Error ? error.message : 'Routine seed failed.');
  process.exit(1);
});
