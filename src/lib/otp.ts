import {createHash,randomInt,randomUUID,timingSafeEqual} from 'node:crypto';
import type {OtpChallenge} from '../../shared/auth';
import {demoModeSetting,isDeployedEnvironment} from './runtime-config';
export class OtpError extends Error {
  constructor(message:string,public status=400){super(message);}
}
export function normalizePhone(input:string):string|null {
  const compact=input.trim().replace(/[ ()-]/g,'');
  const phone=/^[6-9]\d{9}$/.test(compact)?`+91${compact}`:compact;
  return /^\+[1-9]\d{7,14}$/.test(phone)?phone:null;
}
export interface OtpProvider {
  request(phone:string):Promise<OtpChallenge>;
  verify(challengeId:string,code:string):Promise<string>;
}
type Challenge={phone:string;hash:Buffer;expiresAt:number;resendAt:number;attempts:number;used:boolean};
const digest=(id:string,code:string)=>createHash('sha256').update(`${id}:${code}`).digest();
/** Local, single-process simulator only. Never sends SMS or proves phone ownership. */
export class MockOtpProvider implements OtpProvider {
  private challenges=new Map<string,Challenge>();
  constructor(private now=()=>Date.now()){}
  forgetPhone(phone:string) {
    for(const [id,item]of this.challenges)if(item.phone===phone)this.challenges.delete(id);
  }
  async request(phone:string):Promise<OtpChallenge> {
    const now=this.now();
    for(const [id,item] of this.challenges)if(item.expiresAt<=now)this.challenges.delete(id);
    const previous=[...this.challenges.entries()].filter(([,item])=>item.phone===phone);
    if(previous.some(([,item])=>item.resendAt>now))throw new OtpError('Wait 60 seconds before requesting another code.',429);
    if(this.challenges.size>=1000)throw new OtpError('Please try again later.',429);
    for(const [id] of previous)this.challenges.delete(id);
    const challengeId=randomUUID();const code=randomInt(0,1000000).toString().padStart(6,'0');
    const expiresAt=now+5*60000;const resendAt=now+60000;
    this.challenges.set(challengeId,{phone,hash:digest(challengeId,code),expiresAt,resendAt,attempts:0,used:false});
    return {challengeId,expiresAt,resendAt,mockCode:code};
  }
  async verify(challengeId:string,code:string):Promise<string> {
    const item=this.challenges.get(challengeId);
    if(!item || item.used || item.expiresAt<=this.now() || item.attempts>=5)throw new OtpError('Code expired or unavailable. Request a new code.');
    item.attempts++;
    if(!/^\d{6}$/.test(code) || !timingSafeEqual(item.hash,digest(challengeId,code)))throw new OtpError(item.attempts>=5?'Too many attempts. Request a new code.':'Incorrect code. Please try again.');
    item.used=true;
    return item.phone;
  }
}
export function mockOtpAllowed(env:Record<string,string|undefined>,demoMode:boolean) {
  return demoModeSetting(env)==='true'&&!isDeployedEnvironment(env)&&demoMode&&(env.SMS_PROVIDER??'mock')==='mock';
}
