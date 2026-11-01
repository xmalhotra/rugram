import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError, readApiResponse } from '../shared/api-response';

test('proxy HTML errors produce a friendly message with a request reference', async () => {
  await assert.rejects(
    readApiResponse(
      new Response('<html>Bad gateway</html>', {
        status: 502,
        headers: { 'X-Request-Id': 'req-123' },
      }),
    ),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 502);
      assert.equal(error.requestId, 'req-123');
      assert.match(error.message, /Reference: req-123/);
      assert.doesNotMatch(error.message, /<html>|JSON/);
      return true;
    },
  );
});
test('auth errors have consistent session expiry wording', async () => {
  await assert.rejects(
    readApiResponse(new Response('{}', { status: 401 })),
    /Session expired, please sign in again/,
  );
});
test('validation responses retain actionable field errors', async () => {
  await assert.rejects(
    readApiResponse(new Response('{"error":"Enter an event title."}', { status: 400 })),
    /Enter an event title/,
  );
});
test('successful malformed responses and no-content responses are handled', async () => {
  assert.deepEqual(await readApiResponse(new Response('{"ok":true}')), { ok: true });
  assert.equal(await readApiResponse(new Response(null, { status: 204 })), undefined);
  await assert.rejects(readApiResponse(new Response('<html>')), /unexpected response/);
});
