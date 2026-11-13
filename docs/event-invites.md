# Event invite requests

Users request an invite through the existing approval registration flow. Pending requests appear in the creator's Invites inbox and in the admin inbox, including admin-owned events. Ordinary members and unrelated creators cannot access request details. Existing approval capacity, publication and authorization checks still apply.

The inbox reads current registration state, not a second notification copy: approval, decline and withdrawal remove a request automatically. Cancelled, archived and started events do not appear. Counts cover all pending requests; the latest 100 are loaded at a time. There are no phone numbers in the response.

The focused, foreground app checks every 15 seconds and on returning to the foreground. New requests after the initial load show an alert. Existing requests show a count and remain available for review, without replaying alerts every time the app opens. This is an actionable inbox, not a permanent notification history/read-receipt system.

This does not send background/closed-app push, SMS or email. Those require a delivery provider, device tokens, permission handling and reliable retry/outbox infrastructure. Production persistence uses existing registration tables; local demo mode remains in-memory. External Luma/Meetup registrations cannot generate these alerts without a provider integration.
