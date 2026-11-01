# Goal-led Flows

The native Flows screen now starts with seven interests rather than the earlier
Fitness/Tech split: Better sleep, Workout, Running, HYROX, CrossFit, Coding and
Nutrition. The user saves a current focus, then previews a starter flow before
trying it. Nothing is joined automatically; no time or weekly schedule is
required. See `focus-onboarding.md` for the current journey.

Fitness paths: HYROX and hybrid training, getting leaner, building muscle, and
overall fitness. Tech paths: web development, AI and machine learning, cloud
and DevOps, and cybersecurity.

The shared editorial catalog lives in `shared/flow-catalog.ts`. Each new flow has
an area, path, experience level, rhythm, milestone, practical actions, a weekly
reflection prompt, and background reading. Fitness content is a general habit
framework, not an individualised training or nutrition programme. Sources are
background references, not claims that the complete flow is scientifically
validated or endorsed by a creator. Outcomes are not guaranteed.

Joining/removing and completing actions use the existing authenticated mobile
API and profile persistence. Existing saved morning, walking and sleep flows
remain functional but do not appear in the new goal discovery. Stable flow and
step IDs must be maintained to preserve saved history.

Daily checkmarks record actions done today, not a daily quota. A weekly action
is not expected every day. The weekly check-in is currently a reflection prompt,
not a stored journal, clinical assessment, learning assessment, or AI evaluator.
The current focus and joined flows are saved to the profile. Product Picks,
Events, and authentication are unchanged by focus selection.

Phone OTP sign-in now uses a local SMS simulator. See `phone-auth.md` for test
accounts, limits, and the future MSG91 integration boundary.
