export type RegistrationStatus='pending'|'approved'|'declined'|'cancelled';
export type EventRegistration={eventId:string;userId:string;status:RegistrationStatus;requestedAt:string;updatedAt:string};
export type EventGuest={id:string;name:string;avatarUrl:string|null;status:RegistrationStatus};
export type EventRegistrationView={capacity?:number;pendingCount?:number;eventStatus?:'published'|'pending'|'archived';registrationStatus?:import('./mobile').CityEvent['registrationStatus'];mode:'approval'|'external';ownStatus:RegistrationStatus|null;approvedCount:number|null;canManage:boolean;canViewAttendees:boolean;guests:EventGuest[];requests:EventGuest[];note:string};
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
