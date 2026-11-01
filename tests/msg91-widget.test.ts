import assert from 'node:assert/strict';
import test from 'node:test';
import { Msg91WidgetProvider, type WidgetChallengeStore } from '../src/lib/msg91-widget';

function fixture(identifier = '919876543210', length: 4 | 6 = 6) {
  let used = false;
  let attempts = 0;
  let requestId: string | null = null;
  const store: WidgetChallengeStore = {
    async reserve() {
      return true;
    },
    async attempt() {
      return !used && attempts++ < 5 ? '+919876543210' : null;
    },
    async consume() {
      if (used) return false;
      used = true;
      return true;
    },
    async invalidate() {
      used = true;
    },
    async attachRequest(_id, id) {
      requestId = id;
      return true;
    },
    async providerRequest() {
      return requestId;
    },
  };
  const calls: { url: string; body: Record<string, string>; headers: Headers }[] = [];
  const send: typeof fetch = async (input, options) => {
    calls.push({
      url: String(input),
      body: JSON.parse(String(options?.body)),
      headers: new Headers(options?.headers),
    });
    const action = String(input).split('/').pop();
    return Response.json({
      type: 'success',
      message:
        action === 'sendOtpMobile'
          ? 'request-1'
          : action === 'verifyOtp'
            ? 'private-jwt'
            : identifier,
    });
  };
  return {
    provider: new Msg91WidgetProvider(
      'private-key',
      'widget-id',
      store,
      send,
      undefined,
      length,
      'widget-token',
    ),
    calls,
    store,
  };
}

test('widget runs the official three-step REST flow and hides provider tokens', async () => {
  const { provider, calls } = fixture();
  const item = await provider.request('+919876543210');
  assert.equal(item.mockCode, undefined);
  assert.deepEqual(calls[0].body, {
    widgetId: 'widget-id',
    tokenAuth: 'widget-token',
    identifier: '919876543210',
  });
  assert.doesNotMatch(JSON.stringify(item), /private-key|widget-token|request-1|private-jwt/);
  assert.equal(await provider.verify(item.challengeId, '123456'), '+919876543210');
  assert.deepEqual(
    calls.map(row => row.url),
    ['sendOtpMobile', 'verifyOtp', 'verifyAccessToken'].map(
      action => `https://control.msg91.com/api/v5/widget/${action}`,
    ),
  );
  assert.deepEqual(calls[1].body, {
    widgetId: 'widget-id',
    tokenAuth: 'widget-token',
    reqId: 'request-1',
    otp: '123456',
  });
  assert.deepEqual(calls[2].body, { 'access-token': 'private-jwt', authkey: 'private-key' });
  assert.ok(calls.every(row => row.headers.get('authkey') === null));
  await assert.rejects(provider.verify(item.challengeId, '123456'));
});

test('widget token for another phone or an email never authenticates this challenge', async () => {
  for (const identifier of ['918765432109', 'person@example.com']) {
    const { provider } = fixture(identifier);
    const item = await provider.request('+919876543210');
    await assert.rejects(provider.verify(item.challengeId, '123456'), /Phone verification failed/);
  }
});

test('four-digit widget challenges advertise and enforce their configured length', async () => {
  const { provider, calls } = fixture('919876543210', 4);
  const challenge = await provider.request('+919876543210');
  assert.equal(challenge.otpLength, 4);
  await assert.rejects(provider.verify(challenge.challengeId, '123456'), /4-digit/);
  assert.equal(calls.length, 1, 'Wrong length must not reach the provider');
  assert.equal(await provider.verify(challenge.challengeId, '1234'), '+919876543210');
  assert.equal(calls[1].body.otp, '1234');
});

test('widget malformed, non-JSON, HTTP and provider error responses fail closed', async () => {
  for (const response of [
    () => Response.json({ type: 'error', message: 'private-error' }),
    () => Response.json({ type: 'success' }),
    () => new Response('<html>bad gateway</html>', { status: 502 }),
  ]) {
    const { store } = fixture();
    const provider = new Msg91WidgetProvider(
      'key',
      'widget',
      store,
      async () => response(),
      undefined,
      6,
      'widget-token',
    );
    await assert.rejects(provider.request('+919876543210'), error => {
      assert.doesNotMatch(String(error), /private-error|html/);
      return true;
    });
  }
});

test('widget configuration fails closed when either credential is absent', () => {
  const { store } = fixture();
  for (const [key, widget, token] of [
    ['', 'widget', 'token'],
    ['key', '', 'token'],
    ['key', 'widget', ''],
  ]) {
    assert.throws(
      () => new Msg91WidgetProvider(key, widget, store, undefined, undefined, 4, token),
      /not configured/,
    );
  }
});

test('widget follows only bounded, same-action redirects to documented HTTPS API hosts', async () => {
  const { store } = fixture();
  const calls: { url: string; options?: RequestInit }[] = [];
  const send: typeof fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return calls.length === 1
      ? new Response(null, {
          status: 307,
          headers: { Location: 'https://api.msg91.com/api/v5/widget/sendOtpMobile' },
        })
      : Response.json({ type: 'success', message: 'request-1' });
  };
  await new Msg91WidgetProvider('key', 'widget', store, send, undefined, 4, 'token').request(
    '+919876543210',
  );
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options?.method, 'POST');
  assert.equal(calls[1].options?.body, calls[0].options?.body);
  assert.ok(calls.every(call => call.options?.redirect === 'manual'));

  for (const target of [
    'https://evil.example/api/v5/widget/sendOtpMobile',
    'http://control.msg91.com/api/v5/widget/sendOtpMobile',
    'https://control.msg91.com/other',
    'https://control.msg91.com/api/v5/widget/sendOtpMobile?token=secret',
  ]) {
    let count = 0;
    const rejectRedirect: typeof fetch = async () => {
      count++;
      return new Response(null, { status: 307, headers: { Location: target } });
    };
    await assert.rejects(
      new Msg91WidgetProvider(
        'key',
        'widget',
        fixture().store,
        rejectRedirect,
        undefined,
        4,
        'token',
      ).request('+919876543210'),
    );
    assert.equal(count, 1, 'Credentials must not be forwarded to an untrusted URL');
  }
  let loops = 0;
  await assert.rejects(
    new Msg91WidgetProvider(
      'key',
      'widget',
      fixture().store,
      async () => {
        loops++;
        return new Response(null, {
          status: 307,
          headers: { Location: 'https://control.msg91.com/api/v5/widget/sendOtpMobile' },
        });
      },
      undefined,
      4,
      'token',
    ).request('+919876543210'),
  );
  assert.equal(loops, 3);
});
