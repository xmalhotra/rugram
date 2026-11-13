import {apiError,apiJson,unauthorized} from '@/lib/http';
import {getSessionUser} from '@/lib/store';
import {tokenId} from '@/lib/session';
import {observed} from '@/lib/mobile-http';
import {allowSharedRequest} from '@/lib/rate-limit';
import {simulateJourney} from '@/lib/demo-journey';
export const POST=observed(async(request:Request)=>{const token=request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];const user=token?await getSessionUser(tokenId(token)):null;if(!user)return unauthorized();if(user.role!=='admin')return apiError('Admin access required.',403);if(!await allowSharedRequest(`demo-simulation:${user.id}`,3,60000))return apiError('Please wait before running the demo again.',429);try{return apiJson(await simulateJourney(user));}catch(error){if(error instanceof Error&&(error.message.startsWith('Simulation ')||error.message.startsWith('Content ')))return apiError(error.message);throw error;}});
