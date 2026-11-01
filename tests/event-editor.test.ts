import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {containsCode} from './source-assertions';
import {eventEditorError,eventEditorSteps} from '../shared/event-editor';
const now=Date.parse('2026-10-17T00:00:00Z');
const form={registrationMode:'approval',title:'Builders meetup',description:'Build a demo together.',city:'Hyderabad',topic:'Tech',venue:'Community Hall',startsAt:'2026-11-01T10:00:00.000Z',organizerName:'Host',guestCapacity:'100',audience:'Local developers',outcome1:'Build a useful project',priorityReason:'Relevant local developer meetup.'};
test('hosted event steps allow a free event without an external URL',()=>{
 for(const step of eventEditorSteps)assert.equal(eventEditorError(form,step,true,now),null,step);
 assert.match(eventEditorError({...form,guestCapacity:'0'},'Guests',true,now)!,/guest limit/);
 assert.match(eventEditorError({...form,guestCapacity:'1.5'},'Guests',true,now)!,/guest limit/);
 assert.match(eventEditorError({...form,audience:''},'Guests',true,now)!,/who/);
 assert.match(eventEditorError({...form,outcome1:''},'Guests',true,now)!,/reason/);
});
test('dates, external sources and admin review reasons remain required',()=>{
 assert.match(eventEditorError({...form,startsAt:'2025-01-01'},'When',true,now)!,/future/);
 assert.match(eventEditorError({...form,endsAt:'2026-10-01'},'When',true,now)!,/End time/);
 assert.match(eventEditorError({...form,registrationClosesAt:'2027-01-01'},'Guests',true,now)!,/Registration/);
 const external={...form,registrationMode:'external'};
 assert.match(eventEditorError(external,'Basics',true,now)!,/HTTPS/);
 assert.match(eventEditorError(external,'Review',true,now)!,/source/);
 assert.equal(eventEditorError({...external,registrationUrl:'https://luma.com/test',source1:'https://luma.com/test'},'Review',true,now),null);
 assert.match(eventEditorError({...form,priorityReason:''},'Review',false,now)!,/priority/);
});
test('event editor uses a fixed action footer and a real review, not a step dropdown',()=>{
 const source=readFileSync('mobile/src/EventLinkFields.tsx','utf8');assert.match(source,/What are you planning/);assert.match(source,/Ready to share/);containsCode(source,'eventEditorError(form,step,creator)');assert.match(source,/Submit for approval/);assert.doesNotMatch(source,/<Choice|<Field|ISO; blank/);
 assert.ok(source.search(/borderTopWidth:\s*1/)>source.indexOf('</ScrollView>'));
 const app=readFileSync('mobile/App.tsx','utf8');containsCode(app,"scrollable={editor!=='event'");containsCode(app,'<EventLinkFields busy={busy}');
});
