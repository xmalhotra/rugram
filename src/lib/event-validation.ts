import {z} from 'zod';
import {eventWithinYear,eventHorizon} from '../../shared/event-registration';
import {eventTopics} from '../../shared/event-discovery';
import {eventWebsite} from '../../shared/event-discovery';
const link=z.string().max(2048).refine(value=>Boolean(eventWebsite(value)),'Use a public HTTPS event source link.');
const eventFields=z.object({
  title:z.string().trim().min(3).max(100),
  topic:z.enum(eventTopics),
  city:z.string().trim().min(2).max(80),
  venue:z.string().trim().min(3).max(160),
  startsAt:z.string().datetime().refine(value=>eventWithinYear(value),'Choose a date from now through the next calendar year.'),
  description:z.string().trim().min(10).max(800),
  registrationUrl:z.string().max(2048).optional(),
  approvalRequired:z.boolean().optional(),
  registrationMode:z.enum(['external','approval']).optional(),guestCapacity:z.number().int().min(1).max(10000).optional(),organizers:z.array(z.object({name:z.string().trim().min(2).max(100),profileUrl:z.string().url().refine(value=>Boolean(eventWebsite(value))).optional(),avatarUrl:z.string().url().refine(value=>Boolean(eventWebsite(value))).optional()}).strict()).max(10).optional(),
  country:z.string().regex(/^[A-Z]{2}$/),
  endsAt:z.string().datetime().optional(),
  sourceUrls:z.array(link).max(5),checkedAt:z.string().datetime().refine(value=>Date.parse(value)<=Date.now()+300000,'Source check cannot be in the future.'),
  registrationClosesAt:z.string().datetime().nullable(),entryFee:z.number().nonnegative().max(1000000).nullable(),feeNote:z.string().trim().max(500),
  registrationStatus:z.enum(['Check provider','Tickets coming soon','Registration link available','Waitlist','Sold out','Closed','Cancelled']),
  audience:z.string().trim().min(5).max(300),outcomes:z.array(z.string().trim().min(5).max(200)).min(1).max(4),editorialPriority:z.object({score:z.number().int().min(1).max(5),reason:z.string().trim().min(10).max(500)}).strict(),
}).strict();
const dates=<T extends {endsAt?:string;startsAt:string;registrationClosesAt:string|null;registrationMode?:'external'|'approval';registrationUrl?:string;guestCapacity?:number;entryFee:number|null;organizers?:unknown[]}>(schema:z.ZodType<T>)=>schema.refine(value=>Date.parse(value.startsAt)<=eventHorizon()&&(!value.endsAt||Date.parse(value.endsAt)<=eventHorizon()),'Events must be within the next calendar year.').refine(value=>value.registrationMode==='approval'?Boolean(value.guestCapacity&&value.organizers?.length&&value.entryFee===0):Boolean(value.registrationUrl&&eventWebsite(value.registrationUrl)&&(value as T&{sourceUrls?:string[]}).sourceUrls?.length),'External events need an HTTPS registration link; in-app approval events need named organisers, a guest limit and free entry.').refine(value=>!value.endsAt || new Date(value.endsAt).getTime()>=new Date(value.startsAt).getTime(),'End date must not be before the start date.').refine(value=>!value.registrationClosesAt||Date.parse(value.registrationClosesAt)<=Date.parse(value.endsAt??value.startsAt),'Registration deadline must not be after the event ends.');
export const eventLinkSchema=dates(eventFields);
export const eventContentSchema=dates(eventFields.extend({startsAt:z.string().datetime()}));
export const creatorEventSchema=dates(eventFields.omit({editorialPriority:true}));
