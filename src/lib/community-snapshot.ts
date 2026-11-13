/**
 * A published community flow at one version, if the member can still see it.
 * The author has to be an active account. A saved version stays readable after a newer one is published.
 * Demo mode reads the in-memory community store and does not import the community module.
 */
import type { FlowCardReference } from '../../shared/personal-flows';

export type CommunitySnapshot = { title: string; cards: FlowCardReference[]; version: number };

type StoredFlow = {
  id: string;
  authorId: string;
  title: string;
  cards: FlowCardReference[];
  version: number;
};

type StoredVersion = { version: number; title: string; cards: FlowCardReference[] };

type DemoCommunity = {
  flows: Map<string, StoredFlow>;
  versions: Map<string, StoredVersion[]>;
};

function demoCommunity() {
  return (globalThis as { qramDemoCommunity?: DemoCommunity }).qramDemoCommunity;
}

function authorVisible(authorId: string) {
  const hidden = (globalThis as { qramDemoHiddenAuthors?: Set<string> }).qramDemoHiddenAuthors;
  if (hidden?.has(authorId)) return false;
  const users = (globalThis as { rugramDemoStore?: { users: { id: string; disabled?: boolean }[] } }).rugramDemoStore?.users;
  if (!users) return true;
  return users.some(person => person.id === authorId && !person.disabled);
}

function fromDemo(id: string, version: number | undefined): CommunitySnapshot | 'missing' | 'version' {
  const flow = demoCommunity()?.flows.get(id);
  if (!flow || !authorVisible(flow.authorId)) return 'missing';
  const wanted = version ?? flow.version;
  if (flow.version === wanted) return { title: flow.title, cards: flow.cards, version: flow.version };
  const past = demoCommunity()?.versions.get(id)?.find(row => row.version === wanted);
  if (!past) return 'version';
  return { title: past.title, cards: past.cards, version: past.version };
}

/**
 * The flow at `version`, or the current one when version is omitted.
 * `missing` means it is gone or the author is hidden. `version` means that edition is not on record.
 */
export async function communitySnapshot(
  id: string,
  version: number | undefined,
  demo: boolean,
): Promise<CommunitySnapshot | 'missing' | 'version'> {
  if (demo) return fromDemo(id, version);
  const { database } = await import('./database');
  const sql = database();
  const rows = await sql`SELECT f.title, f.cards, f.version FROM community_flows f
    JOIN users u ON u.id = f.author_id AND NOT u.is_disabled
    WHERE f.id = ${id} LIMIT 1`;
  const row = rows[0];
  if (!row) return 'missing';
  const current = Number(row.version);
  const wanted = version ?? current;
  if (wanted === current)
    return { title: String(row.title), cards: row.cards as FlowCardReference[], version: current };
  const older = await sql`SELECT title, cards, version FROM community_flow_versions WHERE flow_id = ${id} AND version = ${wanted} LIMIT 1`;
  const past = older[0];
  if (!past) return 'version';
  return { title: String(past.title), cards: past.cards as FlowCardReference[], version: Number(past.version) };
}
