# Calendar export

A5 uses a generated RFC 5545 `.ics` file and the explicitly approved Expo sharing
package. It does not request calendar permission or write entries automatically.
The button opens the system share sheet only after a tap. A compatible calendar
app is required; supported import destinations differ by device.

Hosted-event export is offered to approved guests and hosts. External-event
exports explicitly say registration remains with the provider and do not imply
a ticket. Time-bearing entries declare Asia/Kolkata; date-only entries remain
all-day. Unknown ends are omitted and labelled, not invented. Notes contain only
public event context; no roster, profile or session data is exported.

One bounded public-event cache file is overwritten for each export. Sharing does
not prove that the person imported it. Qram cannot update or remove an
entry after import; event-change inbox messages remind the member to update it.

Pure tests cover IST timing, all-day dates, unknown ends, cancellation, injection
escaping and UTF-8 line folding. Actual iOS/Android calendar import still requires
a native development build/device; it has not been certified here.
