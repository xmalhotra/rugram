import type {CityEvent} from './mobile';
import type {EventRegistrationView} from './event-registration';
export function registrationPresentation(event:CityEvent,value:EventRegistrationView,now=Date.now()){
  const mine=value.ownStatus;
  const closed=event.status!=='published'?'Registration unavailable':event.registrationStatus==='Cancelled'?'Event cancelled':Date.parse(event.endsAt??event.startsAt)<=now?'Event ended':Date.parse(event.startsAt)<=now?'Event has started':null;
  const canCancel=['pending','approved'].includes(mine??'')&&Date.parse(event.startsAt)>now;
  if(closed)return {title:closed,detail:'No new requests are being accepted.',canRequest:false,canCancel,action:'Request to join'};
  if(mine==='approved')return {title:'You’re going',detail:'Your place is confirmed.',canRequest:false,canCancel,action:'Request to join'};
  if(mine==='pending')return {title:'Request sent',detail:'The host will review your request. Your place is not confirmed yet.',canRequest:false,canCancel,action:'Request to join'};
  if(mine==='declined')return {title:'Request not accepted',detail:'The host has not offered you a place for this event.',canRequest:false,canCancel:false,action:'Request to join'};
  const unavailable=event.registrationStatus==='Tickets coming soon'?'Registration opens soon':event.registrationStatus==='Closed'||Boolean(event.registrationClosesAt&&Date.parse(event.registrationClosesAt)<=now)?'Registration closed':event.registrationStatus==='Sold out'||value.approvedCount!==null&&value.approvedCount>=(event.guestCapacity??0)?'Event full':null;
  if(unavailable)return {title:unavailable,detail:unavailable==='Event full'?'No places are available right now.':'New requests aren’t open right now.',canRequest:false,canCancel:false,action:'Request to join'};
  return {title:mine==='cancelled'?'You cancelled':'Approval required',detail:mine==='cancelled'?'Changed your mind? You can send a new request.':'The host reviews requests before confirming a place.',canRequest:true,canCancel:false,action:mine==='cancelled'?'Request again':'Request to join'};
}
