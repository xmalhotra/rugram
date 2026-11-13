import {eventWithinYear,eventHorizon} from './event-registration';
import {eventWebsite} from './event-discovery';
export const eventEditorSteps=['Basics','When','Guests','Review'] as const;
export type EventEditorStep=typeof eventEditorSteps[number];
export function eventEditorError(form:Record<string,string>,step:EventEditorStep,creator=false,now=Date.now()){
 const hosted=form.registrationMode!=='external';
 if(step==='Basics'){
  if((form.title??'').trim().length<3)return 'Give your event a name (at least 3 characters).';
  if((form.description??'').trim().length<10)return 'Add a short description (at least 10 characters).';
  if(!hosted&&!eventWebsite(form.registrationUrl??''))return 'Add a public HTTPS registration link.';
 }
 if(step==='When'){
  if((form.venue??'').trim().length<3)return 'Add the venue or meeting location.';
  if(!eventWithinYear(form.startsAt??'',now))return 'Choose a future start date within the next year.';
  if(form.endsAt&&(!Number.isFinite(Date.parse(form.endsAt))||Date.parse(form.endsAt)<Date.parse(form.startsAt)||Date.parse(form.endsAt)>eventHorizon(now)))return 'End time must be after the start and within the next year.';
 }
 if(step==='Guests'){
  if(hosted){if((form.organizerName??'').trim().length<2)return 'Add the host name.';const n=Number(form.guestCapacity);if(!Number.isInteger(n)||n<1||n>10000)return 'Choose a guest limit from 1 to 10,000.';if(form.organizerUrl&&!eventWebsite(form.organizerUrl))return 'Use a public HTTPS host profile link, or leave it blank.';}
  if((form.audience??'').trim().length<5)return 'Say who the event is for (at least 5 characters).';
  if((form.outcome1??'').trim().length<5)return 'Add one reason to attend (at least 5 characters).';
  if(form.registrationClosesAt&&(!Number.isFinite(Date.parse(form.registrationClosesAt))||Date.parse(form.registrationClosesAt)>Date.parse(form.endsAt||form.startsAt)))return 'Registration must close no later than the event ends.';
  if(!hosted&&form.entryFee?.trim()&&(!Number.isFinite(Number(form.entryFee))||Number(form.entryFee)<0||Number(form.entryFee)>1000000))return 'Enter a valid listed fee, or leave it blank if unknown.';
 }
 if(step==='Review'){
  if(!hosted&&!form.source1?.trim())return 'Add an official source link for this external listing.';
  for(let i=1;i<=5;i++)if(form[`source${i}`]?.trim()&&!eventWebsite(form[`source${i}`].trim()))return `Source ${i} must be a public HTTPS link.`;
  if(!creator&&(form.priorityReason??'').trim().length<10)return 'Add a short editorial priority reason (at least 10 characters).';
 }
 return null;
}
