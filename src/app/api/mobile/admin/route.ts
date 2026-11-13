import {z} from 'zod';
import {apiError,apiJson,unauthorized} from '@/lib/http';
import {observed,readMobileJson} from '@/lib/mobile-http';
import {getSessionUser,adminPeople,adminPersonHistory,adminUpdatePerson} from '@/lib/store';
import {tokenId} from '@/lib/session';
import {allowSharedRequest} from '@/lib/rate-limit';
import {adminDocuments,contentHistory,mutateContent} from '@/lib/admin-content-store';
import {adminCatalogSnapshot,itemAnalytics,mobileBootstrap,projectDemoContent,trackMobile} from '@/lib/mobile-store';
import {contentKinds,reviewQueueOrder} from '../../../../../shared/admin-content';
import {flows} from '../../../../../shared/mobile';
import {workoutCatalog} from '@/lib/exercise-store';
import {reviewCodes} from '../../../../../shared/moderation';
const key=z.string().min(1).max(128);
const edit=z.discriminatedUnion('action',[
  z.object({action:z.enum(['draft','publish','archive']),kind:z.enum(contentKinds),id:key,version:z.number().int().nonnegative(),data:z.record(z.string(),z.unknown()).optional(),reviewNote:z.string().trim().max(500).optional(),reviewCode:z.enum(reviewCodes).optional()}).strict(),
  z.object({action:z.literal('restore'),kind:z.enum(contentKinds),id:key,version:z.number().int().nonnegative(),auditId:key}).strict(),
  z.object({action:z.literal('person'),id:key,name:z.string().trim().min(2).max(100),handle:z.string().trim().min(2).max(80).regex(/^[a-zA-Z0-9_.-]+$/),role:z.enum(['member','creator','admin']),bio:z.string().max(500),instagramUrl:z.union([z.literal(''),z.string().url().refine(url=>new URL(url).hostname==='www.instagram.com'||new URL(url).hostname==='instagram.com')]),avatarUrl:z.union([z.literal(''),z.string().url().refine(url=>url.startsWith('https://'))]),disabled:z.boolean(),reason:z.string().trim().max(500).optional()}).strict(),
]);
async function admin(request:Request){const token=request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];return token?getSessionUser(tokenId(token)):null;}
export const GET=observed(async(request:Request)=>{
  const user=await admin(request);if(!user)return unauthorized();if(user.role!=='admin')return apiError('Admin access required.',403);
  if(!await allowSharedRequest(`admin-read:${user.id}`,120,60000))return apiError('Please slow down.',429);
  const query=new URL(request.url).searchParams;const view=query.get('view')??'content';
  const offset=Number(query.get('offset')??0);if(!Number.isInteger(offset)||offset<0||offset>10000)return apiError('Invalid page.');
  if(view==='people')return apiJson(await adminPeople(user,(query.get('search')??'').slice(0,80),offset));
  if(view==='person-history'){const id=query.get('id')??'';if(!id||id.length>128)return apiError('Choose a person.');return apiJson({history:await adminPersonHistory(user,id)});}
  const kind=z.enum(contentKinds).safeParse(query.get('kind'));const id=query.get('id')??'';
  if(view==='history'){if(!kind.success||!id||id.length>128)return apiError('Choose a content item.');return apiJson({history:await contentHistory(user,kind.data,id)});}
  if(view==='analytics'){if(!kind.success||!id||id.length>128)return apiError('Choose a content item.');const days=Number(query.get('days')??30);if(![7,30,90].includes(days))return apiError('Choose 7, 30 or 90 days.');return apiJson(await itemAnalytics(user,kind.data,id,days,(query.get('activityId')??'').slice(0,128)));}
  const workout=await workoutCatalog();const items=await adminDocuments(user,await adminCatalogSnapshot(user),[...flows,...workout.workouts],workout.exercises);
  const search=(query.get('search')??'').toLowerCase();const pendingOnly=query.get('queue')==='pending';
  const filtered=reviewQueueOrder(items.filter(item=>(pendingOnly?item.pending:!kind.success||item.kind===kind.data)&&`${item.title} ${item.id} ${item.submittedByName??''}`.toLowerCase().includes(search)));
  return apiJson({items:filtered.slice(offset,offset+25),total:filtered.length,pendingTotal:items.filter(item=>item.pending).length,nextOffset:offset+25<filtered.length?offset+25:null,demoMode:(await mobileBootstrap(user)).demoMode});
});
export const POST=observed(async(request:Request)=>{
  const user=await admin(request);if(!user)return unauthorized();if(user.role!=='admin')return apiError('Admin access required.',403);
  if(!await allowSharedRequest(`admin-write:${user.id}`,60,60000))return apiError('Please slow down.',429);
  const parsed=edit.safeParse(await readMobileJson(request));if(!parsed.success)return apiError(parsed.error.issues[0]?.message??'Check your entry.');
  try{
    const input=parsed.data;if(input.action==='person'){const result=await adminUpdatePerson(user,input);await trackMobile(user,'account_updated',{kind:'person',id:input.id});return apiJson({ok:true,sessionsRevoked:result.sessionsRevoked});}
    const workout=await workoutCatalog();const items=await adminDocuments(user,await adminCatalogSnapshot(user),[...flows,...workout.workouts],workout.exercises);const source=items.find(item=>item.id===input.id&&item.kind===input.kind);
    const update=input.action==='restore'?{...input,action:'draft' as const,data:(await contentHistory(user,input.kind,input.id)).find(item=>item.id===input.auditId)?.data??undefined}:input;
    if(input.action==='restore'&&!update.data)return apiError('Content revision no longer available.');
    const result=await mutateContent(user,update,source);
    if(input.action==='publish'||input.action==='archive')projectDemoContent(input.kind,input.id,result.next.published,result.next.status);
    await trackMobile(user,`content_${input.action}`,{kind:input.kind,id:input.id});
    return apiJson({ok:true,version:result.next.version});
  }catch(error){if(error instanceof z.ZodError)return apiError(error.issues[0]?.message??'Check your entry.');const message=error instanceof Error?error.message:'';if(message.startsWith('Content '))return apiError(message,message.includes('changed since')?409:400);if((error as {code?:string})?.code==='23514')return apiError('Content event edit conflicts with existing registrations or cancellation. Refresh and review capacity and status.');if((error as {code?:string})?.code==='23505')return apiError('Content username is already used.');throw error;}
});
