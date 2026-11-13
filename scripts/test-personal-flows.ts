import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createSession, mockPhoneUser } from '../src/lib/store';
import { tokenId } from '../src/lib/session';
import { GET, POST } from '../src/app/api/mobile/route';
import { flows, type MobilePayload } from '../shared/mobile';
import { resolveVisualFlow } from '../shared/visual-flows';
import { resolvePersonalFlow } from '../shared/personal-flows';

// Deliberately process-local fixtures: this script never touches an account database.
process.env.RUGRAM_DEMO_MODE = 'true';
process.env.SMS_PROVIDER = 'mock';
async function main() {
  const tokens: string[] = [];
  for (const phone of ['+12025550811', '+12025550812']) {
    const user = await mockPhoneUser(phone);
    const token = randomUUID();
    await createSession(user.id, tokenId(token), new Date(Date.now() + 600000));
    tokens.push(token);
  }
  async function call(token: string, body?: unknown) {
    const request = new Request('http://localhost/api/mobile', {
      method: body ? 'POST' : 'GET',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const response = await (body ? POST(request) : GET(request));
    return { status: response.status, data: (await response.json()) as MobilePayload };
  }
  const sourceFlowId = 'workout-animal-movements';
  const cardId = resolveVisualFlow(
    flows.find(flow => flow.id === sourceFlowId)!,
    flows,
  ).cards[0].id;
  const id = `personal-${randomUUID()}`;
  const create = {
    action: 'personal-flow-create',
    id,
    name: 'My mixed flow',
    sourceFlowId,
    cardId,
  };
  assert.equal((await call('', create)).status, 401);
  let result = await call(tokens[0], create);
  assert.equal(result.status, 200);
  assert.equal(result.data.profile.personalFlows?.[0].name, 'My mixed flow');
  assert.deepEqual(
    result.data.profile.flowIds,
    [],
    'Adding a card does not force-save its collection',
  );
  assert.equal((await call(tokens[0], create)).data.profile.personalFlows?.length, 1);
  const cindy = resolveVisualFlow(
    flows.find(flow => flow.id === 'workout-cindy')!,
    flows,
  ).cards[2];
  const sleep = resolveVisualFlow(
    flows.find(flow => flow.id === 'sleep')!,
    flows,
  ).cards[1];
  await Promise.all([
    call(tokens[0], {
      action: 'personal-flow-add',
      id,
      sourceFlowId: 'workout-cindy',
      cardId: cindy.id,
    }),
    call(tokens[0], { action: 'personal-flow-add', id, sourceFlowId: 'sleep', cardId: sleep.id }),
  ]);
  result = await call(tokens[0]);
  assert.equal(result.data.profile.personalFlows?.[0].cards.length, 3);
  assert.equal(
    resolvePersonalFlow(result.data.profile.personalFlows![0], result.data.flows).cards.length,
    3,
  );
  assert.equal(
    (await call(tokens[0], { action: 'personal-flow-add', id, sourceFlowId, cardId })).data.profile
      .personalFlows?.[0].cards.length,
    3,
  );
  assert.equal((await call(tokens[1])).data.profile.personalFlows, undefined);
  for (const action of [
    { action: 'personal-flow-rename', id, name: 'Hijack' },
    { action: 'personal-flow-add', id, sourceFlowId, cardId },
    { action: 'personal-flow-remove', id, cardId },
    { action: 'personal-flow-move', id, cardId, direction: 'down' },
  ])
    assert.equal(
      (await call(tokens[1], action)).status,
      400,
      'Another account cannot modify this flow',
    );
  for (const invalid of [
    { ...create, id: `personal-${randomUUID()}`, ownerId: 'injected' },
    { ...create, id: `personal-${randomUUID()}`, name: ' ' },
    { action: 'personal-flow-add', id, sourceFlowId: 'missing', cardId },
    { action: 'personal-flow-add', id, sourceFlowId: 'workout-cindy', cardId },
    { action: 'personal-flow-add', id, sourceFlowId, cardId, title: 'injected' },
  ])
    assert.equal((await call(tokens[0], invalid)).status, 400);
  assert.equal(
    (await call(tokens[0], { action: 'personal-flow-move', id, cardId, direction: 'down' })).data
      .profile.personalFlows?.[0].cards[1].cardId,
    cardId,
  );
  result = await call(tokens[0], { action: 'personal-flow-rename', id, name: 'Before work' });
  assert.equal(result.data.profile.personalFlows?.[0].name, 'Before work');
  assert.equal(
    (await call(tokens[0], { action: 'personal-flow-remove', id, cardId })).data.profile
      .personalFlows?.[0].cards.length,
    2,
  );
  assert.equal(
    (await call(tokens[0])).data.profile.personalFlows?.[0].cards.length,
    2,
    'Persists across bootstrap reload',
  );
  console.log(
    'Personal-flow route checks passed: cross-collection creation/addition, retry deduplication, reload, rename/reorder/removal, session ownership, strict validation, frame resolution. In-memory demo mode only.',
  );
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
