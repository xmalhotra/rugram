export type RegistrationStatus='pending'|'approved'|'declined'|'cancelled'|'waitlisted';
/** A signup question the host adds, e.g. a meal choice or company name. */
export type EventQuestion={id:string;label:string;kind:'choice'|'text';options?:string[];required:boolean};
/** Where an event happens; placeId and coordinates come from the venue search when used. */
export type EventLocation={name:string;address:string;placeId?:string;lat?:number;lng?:number};
export const questionLimits={questions:5,options:8,label:120,option:60,answer:200};
/** Problems with a guest's answers, or null when they satisfy the event's questions. */
export function answersError(questions:EventQuestion[]|undefined,answers:Record<string,string>|undefined){
  const given=answers??{};
  for(const id of Object.keys(given))if(!questions?.some(question=>question.id===id))return 'Answer only this event\'s questions.';
  for(const question of questions??[]){
    const value=(given[question.id]??'').trim();
    if(!value){if(question.required)return `Answer: ${question.label}`;continue;}
    if(value.length>questionLimits.answer)return `Keep "${question.label}" under ${questionLimits.answer} characters.`;
    if(question.kind==='choice'&&!question.options?.includes(value))return `Choose an option for "${question.label}".`;
  }
  return null;
}
/** The status a new request gets: a seat if one is free, the waitlist if the host allows it, else null (full). */
export function requestStatus(event:{guestCapacity?:number;requireApproval?:boolean;waitlist?:boolean},approved:number):RegistrationStatus|null{
  if(approved<(event.guestCapacity??0))return event.requireApproval===false?'approved':'pending';
  return event.waitlist?'waitlisted':null;
}
/** What a promoted waitlisted guest becomes when a seat frees up. */
export function promotedStatus(event:{requireApproval?:boolean}):RegistrationStatus{return event.requireApproval===false?'approved':'pending';}
export type EventRegistration={eventId:string;userId:string;status:RegistrationStatus;requestedAt:string;updatedAt:string;answers?:Record<string,string>};
export type EventGuest={id:string;name:string;avatarUrl:string|null;status:RegistrationStatus};
/** waitlistPosition is 1-based for a waitlisted viewer; answerTally counts choice answers for managers. */
export type EventRegistrationView={waitlistPosition?:number;waitlistCount?:number;answerTally?:{questionId:string;label:string;counts:Record<string,number>}[];requireApproval?:boolean;capacity?:number;pendingCount?:number;eventStatus?:'published'|'pending'|'archived';registrationStatus?:import('./mobile').CityEvent['registrationStatus'];mode:'approval'|'external';ownStatus:RegistrationStatus|null;approvedCount:number|null;canManage:boolean;canViewAttendees:boolean;guests:EventGuest[];requests:EventGuest[];note:string};
export type HostedEventAction='close-event'|'reopen-event'|'cancel-event';
export function hostedEventEditError(previous:import('./mobile').CityEvent,next:import('./mobile').CityEvent,approved:number,registrations:number){
  if(previous.registrationMode!=='approval')return null;
  if(registrations>0&&next.registrationMode!=='approval')return 'Content event with registrations cannot switch to external registration.';
  if(next.registrationMode==='approval'&&(next.guestCapacity??0)<approved)return 'Content event capacity cannot be lower than confirmed registrations.';
  if(previous.registrationStatus==='Cancelled'&&next.registrationStatus!=='Cancelled')return 'Content cancelled events cannot be reopened. Create a new event instead.';
  return null;
}
export function eventHorizon(now=Date.now()){const date=new Date(now);const year=date.getUTCFullYear()+1;const month=date.getUTCMonth();const day=date.getUTCDate();date.setUTCFullYear(year);if(date.getUTCMonth()!==month)date.setUTCDate(0);void day;return date.getTime();}
export function eventWithinYear(value:string,now=Date.now()){const time=Date.parse(value);return Number.isFinite(time)&&time>now&&time<=eventHorizon(now);}
