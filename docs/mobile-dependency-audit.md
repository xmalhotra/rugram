# Mobile dependency audit — 17 October 2026

## Latest: user-approved return to SDK 57 for iPhone Expo Go

SDK 58 was rejected by the user's installed physical-iPhone Expo Go. The user
approved returning to SDK 57. Mobile is aligned to Expo 57.0.30's compatibility
map, including React Native 0.86.3 and React 19.2.3. `expo install --check` passes.
The scoped Xcode UUID override remains in place. The fresh installation reports
22 dependency/metavulnerability findings: 19 high and 3 moderate. This restores
Expo Go testing compatibility, not security release clearance; no force-fix or
advisory suppression was applied. The SDK 58 sections below are historical.

## Current status after broader Expo approval

The user subsequently authorised changing Expo SDK and adding packages needed
for notifications, network/storage, image selection and haptics. Mobile now uses
Expo 58.0.14 / React Native 0.88, aligned with the installed SDK package map.
Node 24.12.0 is selected in `.nvmrc`; Node 25 is not supported by this toolchain.

The latest audit after installation reported **20 high, zero moderate and zero
critical findings** (dependency/metavulnerability counts), from braces and
node-forge. The vulnerable decoder dependency path is gone and the UUID override
remains tested. No force-fix or advisory suppression was used. Release security
clearance remains open pending a compatible upstream fix or reviewed remediation.

Both platform JavaScript exports passed. Native builds have not passed: the
machine lacks full Xcode and an Android SDK. The local SDK-map compatibility check
passed, but that is not online Expo Doctor or native-device certification.
The sections below are retained as historical audit evidence, not current status.

## Targeted remediation after approval

The user approved targeted security updates while preserving Expo SDK 57, without
force-fix, SDK downgrade, prebuild or rebuild. Added a narrowly scoped override
of `xcode > uuid` to `11.1.1`. Xcode only calls `uuid.v4()`; tests verify CommonJS
loading, unique valid UUIDs and its 24-character uppercase project identifiers.
Installation used `npm install --ignore-scripts`.

Fresh audit: **22 findings: 19 high, 3 moderate, zero critical**. UUID is no longer
reported. These are dependency/metavulnerability counts, not distinct exploits.

Remaining blockers:

- Registry `braces` latest is `3.0.3`, still within the advisory range. No published
  patched version was available at this check. It is reached through Metro's
  file-map/micromatch tooling.
- Registry `node-forge` latest is `1.4.0`, still within the advisory range. No
  published patched version was available. Expo CLI and its code-signing tools
  depend on it; native certificate operations need separate security review.
- `decode-uri-component@0.5.0` is outside the advisory range but is ESM-only.
  Its parent `query-string@7.1.3` uses `require()` expecting a callable function,
  so a version override is not a compatible drop-in fix. The audit proposes
  Expo Router 58, which is outside the approved SDK boundary. This decoder can
  process navigation input; do not dismiss it as build-only.

No advisory has been suppressed. Keep development tooling restricted to trusted
networks and do not expose Metro publicly; that reduces exposure but does not
remediate these dependencies. A reviewed upstream/backported fix or separately
approved compatible package migration is required before release clearance.

Backend and mobile typechecks pass. `expo config --type public --json` resolves.
`expo install --check` **fails**: it recommends SDK-57 patch versions for Expo
(`~57.0.30`), UI (`~57.0.25`), Constants (`~57.0.22`), Linking (`~57.0.13`), Router
(`~57.0.28`) and TypeScript (`~6.0.3`). Those broader compatibility updates were
not silently bundled into the UUID fix. No native build or device verification
has been performed. The release gate remains open.

## Initial audit (before targeted remediation)

After installing the approved SDK-compatible `expo-splash-screen`, the current
mobile dependency tree reports 30 findings: 19 high, 11 moderate, zero critical.
These are dependency/metavulnerability counts, not 30 distinct exploits. No
claim is made that this installation introduced all of them.

The underlying advisory entries reported by npm are:

- braces: deeply nested pattern stack-exhaustion denial of service,
  https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- node-forge: RSA signature verification parsing,
  https://github.com/advisories/GHSA-86w9-cpqp-85rv
- decode-uri-component: malformed input decoding denial of service,
  https://github.com/advisories/GHSA-vcc3-ghjq-m6fr
- uuid: v3/v5/v6 buffer bounds,
  https://github.com/advisories/GHSA-w5hq-g745-h8pq

Affected direct dependencies include Expo, Expo Router, React Native, Worklets,
Reanimated, DateTimePicker and the splash package through transitive dependencies.
Some `npm audit` automatic suggestions propose Expo 44 or React Native 0.72. Those
are **not approved remediation plans** for the SDK 57 application. No force-fix,
SDK downgrade or unapproved package replacement has been applied.

The release security gate remains open. Approval was requested for a targeted
security pass preserving SDK 57, with dependency-path analysis, compatible patched
versions where available, regression checks and a fresh audit. If no compatible
fix exists, document the actual affected execution path and mitigation rather
than treating a suppressed advisory as a fix. Native build/device verification
remains a separate approval and release gate.
