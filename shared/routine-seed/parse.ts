import {
  routineCheckpoints,
  routineSlug,
  routineTypes,
  type Routine,
  type RoutineCheckpoint,
  type RoutineItem,
  type RoutineType,
} from '../routines';

const checkpointSet = new Set<string>(routineCheckpoints);
const typeSet = new Set<string>(routineTypes);

function cells(line: string) {
  return line.split('|').map(cell => cell.trim());
}

function list(value: string | undefined) {
  if (!value) return [];
  return value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
}

/** "Name | aliases | serving" lines. The file's type applies to every row. */
export function parseItemLines(source: string, type: RoutineType): RoutineItem[] {
  const items: RoutineItem[] = [];
  for (const raw of source.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [name, aliases, serving] = cells(line);
    if (!name) throw new Error(`Routine item is missing a name (${type}).`);
    items.push({
      id: routineSlug(name),
      name,
      aliases: list(aliases),
      type,
      serving: serving || null,
    });
  }
  return items;
}

/**
 * "Title | Type | Main | Also | Region | aliases | Part=amount; Part" lines.
 * Rank follows the order lines are read.
 */
export function parseRoutineLines(source: string, startRank: number): Routine[] {
  const routines: Routine[] = [];
  let rank = startRank;
  for (const raw of source.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [title, type, main, also, region, aliases, parts] = cells(line);
    if (!title || !typeSet.has(type) || !checkpointSet.has(main) || !region)
      throw new Error(`Routine line is incomplete: ${line}`);
    const extras = list(also);
    if (extras.some(checkpoint => !checkpointSet.has(checkpoint)))
      throw new Error(`Routine "${title}" has an unknown checkpoint.`);
    const checkpoints = [main, ...extras.filter(checkpoint => checkpoint !== main)] as RoutineCheckpoint[];
    const parsedParts = (parts ?? '')
      .split(';')
      .map(part => part.trim())
      .filter(Boolean)
      .map((part, position) => {
        const [itemName, amount] = part.split('=').map(piece => piece.trim());
        if (!itemName) throw new Error(`Routine "${title}" has an empty part.`);
        return { itemId: routineSlug(itemName), amount: amount || null, position };
      });
    if (!parsedParts.length) throw new Error(`Routine "${title}" has no parts.`);
    routines.push({
      id: routineSlug(title),
      title,
      aliases: list(aliases),
      type: type as RoutineType,
      mainCheckpoint: main as RoutineCheckpoint,
      checkpoints,
      region,
      rank,
      parts: parsedParts,
    });
    rank += 1;
  }
  return routines;
}
