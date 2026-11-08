import 'server-only';
import {
  curateByKeywords,
  curationLimits,
  type CommunityCuration,
  type CommunityFeedItem,
} from '../../../shared/community-flows';
import type { PublicUser } from '../types';
import { communityFeed } from './community';
import { getProfile } from './profile';

type Pick = { flowId: string; reason: string };
const concise = (text: string, max: number) => text.replace(/\s+/g, ' ').trim().slice(0, max);

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    picks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { id: { type: 'string' }, reason: { type: 'string' } },
        required: ['id', 'reason'],
      },
    },
  },
  required: ['summary', 'picks'],
} as const;

/** Returns null whenever the model is unavailable, slow or off-list, so callers fall back. */
async function curateWithModel(
  prompt: string,
  items: CommunityFeedItem[],
  signals: { ownFlows: string[]; upvoted: string[] },
): Promise<{ summary: string; picks: Pick[] } | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !items.length) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9_000);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_QRAM_MODEL ?? 'gpt-5-mini',
        store: false,
        instructions: `You are Qram's curator. Members publish sequences: ordered cards from a reviewed catalogue. Pick at most ${curationLimits.picks} IDs from available_sequences that best answer the request, best first, using the member's own flows and upvotes as taste signals. Return no picks rather than weak ones. Each reason is one short sentence on why it fits. Do not diagnose, prescribe, or promise outcomes. The summary is one sentence describing the list.`,
        input: JSON.stringify({
          request: prompt,
          member: signals,
          available_sequences: items.map(({ flow }) => ({
            id: flow.id,
            title: flow.title,
            description: flow.description,
            cards: flow.cards.map(card => card.title),
            author: flow.author.name,
            upvotes: flow.upvotes,
            reposts: flow.reposts,
          })),
        }),
        text: { format: { type: 'json_schema', name: 'qram_curation', strict: true, schema } },
      }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { output_text?: unknown };
    if (typeof body.output_text !== 'string') return null;
    const value = JSON.parse(body.output_text) as { summary?: unknown; picks?: { id?: unknown; reason?: unknown }[] };
    if (typeof value.summary !== 'string' || !Array.isArray(value.picks)) return null;
    const known = new Set(items.map(item => item.flow.id));
    const used = new Set<string>();
    const picks = value.picks.flatMap(pick => {
      if (typeof pick.id !== 'string' || typeof pick.reason !== 'string') return [];
      if (!known.has(pick.id) || used.has(pick.id)) return [];
      used.add(pick.id);
      return [{ flowId: pick.id, reason: concise(pick.reason, 160) }];
    });
    return { summary: concise(value.summary, 200), picks: picks.slice(0, curationLimits.picks) };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function curateCommunity(user: PublicUser, raw: string): Promise<CommunityCuration> {
  const prompt = concise(raw, curationLimits.prompt);
  const [feed, profile] = await Promise.all([communityFeed(user, 'for-you'), getProfile(user)]);
  const model = await curateWithModel(prompt, feed.items, {
    ownFlows: (profile.personalFlows ?? []).map(flow => flow.name),
    upvoted: feed.items.filter(item => item.flow.viewer.upvoted).map(item => item.flow.title),
  });
  const picks = model?.picks ?? curateByKeywords(prompt, feed.items);
  const byId = new Map(feed.items.map(item => [item.flow.id, item]));
  return {
    prompt,
    summary:
      model?.summary ??
      (picks.length
        ? `${picks.length} published ${picks.length === 1 ? 'sequence matches' : 'sequences match'} your words.`
        : 'No published sequences match those words yet.'),
    engine: model ? 'ai' : 'keywords',
    items: picks.map(pick => ({ ...byId.get(pick.flowId)!, reason: pick.reason })),
    copies: feed.copies,
  };
}
