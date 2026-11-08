import {apiError,apiJson,unauthorized} from '@/lib/http';
import {observed,readMobileJson} from '@/lib/mobile-http';
import {getSessionUser,setOwnName} from '@/lib/store';
import {tokenId} from '@/lib/session';
import {deleteAccount,exportAccount} from '@/lib/account-store';
import {AccountError} from '../../../../../shared/account';
import {allowSharedRequest} from '@/lib/rate-limit';
async function actor(request:Request) {
  const token=request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  return token?getSessionUser(tokenId(token)):null;
}
export const GET=observed(async(request:Request)=>{
  const user=await actor(request);if(!user)return unauthorized();
  if(!await allowSharedRequest(`account-export:${user.id}`,3,3600000))return apiError('Please wait before exporting again.',429);
  const response=apiJson(await exportAccount(user));
  response.headers.set('Cache-Control','no-store');
  response.headers.set('Content-Disposition','attachment; filename="qram-account.json"');return response;
});
export const PATCH=observed(async(request:Request)=>{
  const user=await actor(request);if(!user)return unauthorized();
  if(!await allowSharedRequest(`account-name:${user.id}`,10,3600000))return apiError('Please wait before changing your name again.',429);
  const body=await readMobileJson(request);
  if(!body||typeof body!=='object'||typeof (body as {name?:unknown}).name!=='string')return apiError('Enter your name.');
  try{const next=await setOwnName(user,(body as {name:string}).name);return apiJson({user:{id:next.id,name:next.name}});}
  catch(error){if(error instanceof Error&&error.message.startsWith('Use a name'))return apiError(error.message);throw error;}
});
export const DELETE=observed(async(request:Request)=>{
  const user=await actor(request);if(!user)return unauthorized();
  const body=await readMobileJson(request);
  if(!body||typeof body!=='object'||!('confirm'in body)||body.confirm!=='DELETE')return apiError('Confirm permanent account deletion.');
  try{await deleteAccount(user);return apiJson({ok:true});}
  catch(error){if(error instanceof AccountError)return apiError(error.message,error.status);throw error;}
});
