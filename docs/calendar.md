# Daily flow

A Daily flow is one day. It holds the flows scheduled that day and the lifestyle items for that day, in one list. Day, week and month stay as ways to move through those days. A pattern of Daily flows is a Map flow, which is separate from this.

## One day

`shared/daily-flow.ts` merges that day's series occurrences with the checkpoint items. The list is ordered by time, then by checkpoint.

- A flow with a clock time uses that time.
- A flow or item without a clock sits at its checkpoint: Wake up, Morning, Mid-morning, Lunch, Afternoon, Pre-workout, Post-workout, Dinner, Before bed. Anything saved before checkpoints existed stays under Anytime, last.
- At the same time, a flow comes before an item. Nothing already stored is dropped: an existing series and an existing tick both show on the merged day.

A flow is done by doing it. The row opens the same actions as before (start, skip this time, move, edit, delete). An item is ticked with one tap, one serving at a time, on the day in view. The week shows both kinds for the selected day. The month keeps the grid; a day with flows or items is marked, and opening it shows the list.

An empty day is a rest day.

## Adding a flow

"Add to Wednesday" (or whichever day is selected) opens a sheet that covers the header. Suggested flows come first, each with a reason, such as a muscle that is behind. The rest are grouped by body part. Flows that share a name are one row: Arms is one row with Beginner, Intermediate and Advanced inside it, not three rows. The row shows the chosen level, the minutes and the exercise count.

Adding puts that flow on the day, once. The sheet stays open and shows the day it landed on, then what that does to the predicted figure (`comparePredictions`). Done closes the sheet.

Items are still added from Daily flow in the catalogue. "Add to routine" is now "Add to Daily flow" wherever a member sees it.

## Calendar export

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
