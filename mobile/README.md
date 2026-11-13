# Qram mobile

Native React Native + Expo app. The three core areas are habit flows, budget-filtered product picks, and city gatherings. Creator Studio and Admin tabs are shown only for their roles; permissions are independently enforced by the API.

The app now uses Expo UI native controls and Expo Router native tabs, with Apple-guided typography/layout on iPhone and native Android equivalents. See [the design system](DESIGN_SYSTEM.md). System light/dark appearance, native fields, pickers, toggles, sheets and date/time controls share one theme. After updating dependencies or changing the entry point, restart Expo and reload the app on the phone.

## Run on a phone

1. At the repository root, run `npm run dev` to start the backend.
2. In `mobile`, run `npm ci`, then `npm start`.
3. Scan the QR code using a compatible Expo Go build. Your phone and computer must be on the same network. The app automatically uses the Expo LAN host on port 3000 in development. For a hosted backend, set `EXPO_PUBLIC_API_URL=https://your-api.example.com` before starting Expo.

No Android Studio, Xcode build, or emulator is needed for this workflow. Expo SDK compatibility must match the Expo Go installed on the device. If Expo Go does not support this SDK, use an EAS development build rather than mismatching React Native versions.

Sign-in is phone OTP only. Local mock numbers: `+12025550101` (John), `+12025550102` (Creator), and `+12025550103` (Admin). Choose Get code and enter the code shown in the Mock SMS card. No SMS is actually sent. Other numbers create local demo users. Never publish demo mode. See [phone authentication](../docs/phone-auth.md).

## Features

- Home is a feed of added flows, with story-style suggestions linking to related flows, Picks and events. Use + to explore; recipe/routine previews use Add flow. Remove flows from the profile. Stories are curated suggestions, not a live daily publishing feed. See [Home and stories](../docs/home-feed.md).
- After OTP sign-in, choose a current focus: Better sleep, Workout, Running, HYROX, CrossFit, Coding or Nutrition. Save the focus, preview a starter, then explicitly try the flow. No Cooking category or automatic routine enrollment. See [focus-first onboarding](../docs/focus-onboarding.md).
- Nutrition now drills into everyday protein, hydration/electrolytes and pre/intra/post-workout habits, then food preference or Running/Gym/HYROX context. See [the Nutrition journey](../docs/nutrition-journey.md).
- Flow habits can open related central-library Picks and return to the plan. HYROX includes optional drink comparisons and upcoming Indian race information below the habits. See [connected flows and checked sources](../docs/connected-flows.md).
- Picks categories: Food, Supplements, Tech. Tech includes Electronics, Computers, Audio, Wearables and Accessories. Filter Essential/Upgrade/Premium and INR spending limit. Save picks and inspect source links, price-check date, creator backing and disclosures. Migration 008 moves older Electronics records under Tech and archives non-electronic Gear without deleting records.
- Creators submit products for admin review and provide public source links to back product picks. Creators can submit two events per India calendar month by default; admins can change the per-creator allowance, including disabling it with zero. Only admins verify and publish events. Demo catalog has no invented celebrity endorsements.
- Events is a Hyderabad tech shortlist with dates in IST, price/deadline disclosure, audience, benefits, explained editorial priority and source-check dates. Save interest privately or register on Luma, Meetup or the organiser website. No automated scraping/import is connected. HYROX references remain within related flows; older in-app RSVPs remain cancellable from the profile. See [event discovery](../docs/event-discovery.md).
- Admins publish/reject/archive listings and see activity: distinct active users, completions, saves, RSVPs, daily and role breakdowns.
- Admin now has form-based content and category editing, public profile/role
  management, drafts, publication, revision history, per-item/activity analytics
  and a local Simulation workspace. Free approval-based events support private
  guest lists and cancellation; external Luma/Meetup registrations stay external.
  See [the admin and complete journey guide](../docs/admin-workspace.md).
- Sessions are stored in device SecureStore; data lives on the backend. Pull to refresh and connection errors are supported.

## Database and cloud builds

Apply migrations at the root using `npm run db:migrate` against a dedicated development database. Migration 006 creates mobile profiles, catalog, attendance and analytics tables. Production starts with an empty product/event catalog; use an admin account to publish verified content. Existing `member` database accounts map to the mobile `user` role.

Production sign-in is intentionally blocked until a real SMS provider and verified-phone identity persistence are implemented. The existing account-provisioning script only creates legacy database records; its passwords no longer permit mobile sign-in. Do not treat provisioning as a production phone-authentication integration.

`eas.json` includes preview APK and store build profiles. Set the hosted HTTPS API URL in the EAS environment before building. Configure your own Apple/Google identifiers, Expo project and signing credentials. Store publishing has not been performed.

Checks: `npm run typecheck`, `npx expo install --check`; from root: `npm run test:mobile-api` against an isolated local demo backend. No emulator or physical device runtime has been exercised during automated API checks.

Production hardening uses explicit desired states for saves/check-offs/RSVPs, stable submission request IDs, bounded catalog pages, per-account database-backed throttles, and bounded request bodies. Migration 007 is required. The client sends its local time zone for daily check-offs. See `docs/production-readiness.md` for measured simulation results and unpassed release gates.
