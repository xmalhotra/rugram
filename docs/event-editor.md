# Event creation editor

The creator/admin event editor is a full-screen four-step wizard: About, When & where, Guests, Review. Each step has a fixed Back/Continue action; the last step submits through the existing authenticated event creation/update action. It does not publish creator submissions automatically.

Event-specific React Native text inputs and compact selection rows replace the Expo-hosted fields that rendered oversized/clipped controls on the supplied iPhone screenshot. Native date/time pickers remain. Optional organizer URLs, extra attendance reasons, registration deadline/status and source links are disclosed only when needed. Deadlines use a picker instead of asking for an ISO timestamp.

Client-side step validation catches missing required fields, invalid capacity, dates outside the one-year horizon, invalid HTTPS links and inconsistent deadlines before continuing. Final submission rechecks every step. Server schemas, creator quotas, source review, permissions, registration capacity and approval remain authoritative and unchanged.

Hosted events require no external source URL; external listings do. Audience and one attendance reason are required by the existing server schema in both modes. Admin priority justification remains required; creators do not assign their own editorial priority.

Unit tests and demo host/registration simulations pass independently of physical device QA. Keyboard, date-picker and accessibility behaviour still require an iPhone check. Unsaved drafts are not persisted across app restarts.
