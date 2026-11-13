# Phone OTP authentication — local mock

Password sign-in has been removed from both the mobile endpoint and archived
website login endpoint. Previously issued sessions continue until logout/expiry.

Explicitly opt into local development demo mode (`APP_ENV=local`,
`RUGRAM_DEMO_MODE=true`, `SMS_PROVIDER=mock`). The example environment defaults
to database mode; missing database configuration never enables mock login.
The app accepts international numbers with
country codes; unprefixed 10-digit Indian numbers are normalised to +91.
No SMS is sent and no real phone ownership is verified. The random six-digit
mock code is returned to the app and displayed in a clearly labelled test card.
Do not expose this demo backend to untrusted users.

Reserved fictional test numbers:

| Phone | Account |
| --- | --- |
| +12025550101 | John, user |
| +12025550102 | Demo Creator |
| +12025550103 | Admin |

Any other accepted phone creates/reuses an ordinary local demo member after
code verification. A client cannot request a role. Profiles and sessions are
in memory in demo mode and reset when the backend process is restarted.

## Flow and limits

- `POST /api/mobile/auth` with `{action:"request",phone}` creates a challenge.
- Response: challengeId, expiresAt, resendAt, and mockCode (local only).
- `POST /api/mobile/auth` with `{action:"verify",challengeId,code}` consumes it
  and returns a bearer token; SecureStore and logout work as before.
- Codes expire in five minutes; five incorrect attempts lock the challenge.
- Resend waits 60 seconds, creates a new challenge, and invalidates the old one.
- Phone requests are limited to five per hour, with the existing IP throttle.
- Codes are hashed in the challenge store and not written to server logs.
- Challenge storage is capped at 1,000 active entries and is single-process.
- Production, declared preview/staging environments, and database mode reject
  mock authentication, even when `SMS_PROVIDER=mock`. Unsafe demo deployment
  configuration prevents server startup; unsupported authentication providers
  return 503. This is intentionally not production authentication.

## MSG91 adapter: awaiting integration verification

`src/lib/msg91.ts` implements server-side SendOTP/Verify OTP using built-in fetch
(no new package). It requires database mode, `SMS_PROVIDER=msg91`, server-only
`MSG91_AUTH_KEY` and `MSG91_TEMPLATE_ID`, and migration `014_phone_identity.sql`.
Use an approved six-digit OTP template. Missing credentials fail closed.
Real codes are never returned to the app.

The database stores one current challenge per phone: 60-second resend cooldown,
five-minute expiry, five attempts and atomic single-use consumption. Resends
replace the challenge ID across API instances. Provider codes and auth keys are
not persisted. Expired challenge cleanup belongs in the retention/maintenance
work before launch.

After verification, the route looks up the unique verified E.164 identity.
New users always receive the member role. Legacy accounts are not automatically
linked, even if their handle resembles a phone. Creator/admin roles must be
provisioned separately, never inferred from fixture numbers.

Contract tests use simulated HTTP and challenge storage, not a live provider or
database. Migration/concurrency and real SMS delivery remain unverified because
the local environment has no database URL, MSG91 key or template ID. This release
blocker remains open until integration checks pass. Consent and approved template
configuration also remain prerequisites for public use.

References: [SendOTP](https://docs.msg91.com/otp/sendotp),
[Verify OTP example](https://msg91.com/help/hello-contact-center/chatbots-in-hello/msg91-bot/utility/script-use-cases).

Unit tests cover expiry, replay/concurrency, attempt limits, resend invalidation,
normalisation and production guards. Local API smoke covers all demo roles,
blocked password endpoints and authenticated workflows. Existing database load
tests now use directly provisioned isolated test sessions; they do not certify
OTP delivery, login scalability, or production phone identity.

## MSG91 mobile widget

For `SMS_PROVIDER=msg91-widget`, configure `MSG91_WIDGET_ID` (the integration
panel ID, not the widget name), `MSG91_WIDGET_TOKEN` (the panel's `tokenAuth`),
and the separate account-level `MSG91_AUTH_KEY`. All remain in server-only
environment variables. Treat IDs and tokens as strings, never JavaScript numbers.
Set `MSG91_OTP_LENGTH` to the widget's configured length: `4` or `6`.

The adapter follows MSG91's JavaScript mobile SDK request format: JSON requests
to `control.msg91.com/api/v5/widget/sendOtpMobile` and `verifyOtp` include
`widgetId` and `tokenAuth`. The final `verifyAccessToken` request uses the
account authkey and returned access token. The verified identifier must match
the phone bound to the database challenge before a session can be issued.
The app receives no provider tokens or credentials. Mobile integration must be
enabled in MSG91; the web `sendOtp` endpoint is not interchangeable with it.

Local configuration checks confirmed that the widget credentials are accepted,
mobile integration is enabled, and its OTP length is four. These read-only checks
and simulated contract tests do not certify live SMS delivery or a completed
phone login. Captcha is enabled in the provider configuration; if MSG91 requires
an interactive challenge, a supported SDK challenge flow is needed rather than
bypassing the provider's validation.
