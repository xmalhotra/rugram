import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('invite inbox is authenticated and scoped to event managers',()=>{
 const store=readFileSync('src/lib/event-registration-store.ts','utf8');
 assert.match(store,/Event managers only/);
 assert.match(store,/c.data->>'createdBy'=\$\{user.id\}/);
 assert.match(store,/r.status='pending'/);
 assert.match(store,/LIMIT 100/);
 const route=readFileSync('src/app/api/mobile/registrations/route.ts','utf8');
 assert.match(route,/if\(!user\)return unauthorized\(\)/);
 assert.match(route,/eventInviteInbox\(user\)/);
});
test('creator and admin both have a durable foreground inbox linking to event approval actions',()=>{
 for(const path of ['mobile/App.tsx','mobile/app/management.tsx'])assert.match(readFileSync(path,'utf8'),/<NotificationCentre/);
 const centre=readFileSync('mobile/src/NotificationCentre.tsx','utf8');assert.match(centre,/mobile\/notifications/);assert.match(centre,/onOpen\(item.target\)/);assert.match(centre,/clearInterval/);
 const source=readFileSync('mobile/src/EventInviteNotifications.tsx','utf8');
 assert.match(source,/New invite request/);assert.match(source,/Approve invite/);assert.match(source,/Decline/);assert.match(source,/clearInterval\(timer\)/);assert.match(source,/AppState/);assert.match(source,/useFocusEffect/);
});
test('invite header control is a fixed-size icon rather than a full-width native button',()=>{
 const source=readFileSync('mobile/src/EventInviteNotifications.tsx','utf8');
 assert.match(source,/width:hit,height:hit,flexShrink:0/);
 assert.match(source,/<SymbolView name="bell"/);
 assert.match(source,/inbox.total>0&&<View/);
 assert.doesNotMatch(source,/<Button title=\{`Invites/);
 assert.match(source,/accessibilityLabel=\{`Invite requests/);
});
