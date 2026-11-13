import {randomUUID} from 'node:crypto';
import {normalizePhone, OtpError, type OtpProvider} from './otp';
import type {OtpChallenge} from '../../shared/auth';

export interface PhoneChallengeStore {
  reserve(phone:string, challenge:OtpChallenge):Promise<boolean>;
  attempt(id:string):Promise<string|null>;
  consume(id:string):Promise<boolean>;
  invalidate(id:string):Promise<void>;
}

/** Provider generates/verifies codes; the database binds single-use challenges to phones. */
export class Msg91OtpProvider implements OtpProvider {
  constructor(
    private authkey:string,
    private templateId:string,
    private challenges:PhoneChallengeStore,
    private send:typeof fetch=fetch,
    private now=()=>Date.now(),
  ) {
    if(!authkey.trim()||!templateId.trim())throw new OtpError('SMS sign-in is not configured.',503);
  }

  private async call(path:string, params:Record<string,string>, method:'POST'|'GET') {
    const url=new URL(`https://control.msg91.com/api/v5/otp${path}`);
    for(const [key,value] of Object.entries(params))url.searchParams.set(key,value);
    try {
      const response=await this.send(url,{method,headers:{authkey:this.authkey,'Content-Type':'application/json'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
      // Never relay upstream messages, URLs, phone numbers, codes or credentials.
      const body:unknown=await response.json();
      return response.ok&&typeof body==='object'&&body!==null&&'type' in body&&body.type==='success';
    } catch {
      throw new OtpError('SMS service unavailable. Please try again.',503);
    }
  }

  async request(phone:string):Promise<OtpChallenge> {
    if(normalizePhone(phone)!==phone)throw new OtpError('Enter a valid phone number with country code.');
    const now=this.now();
    const challenge={challengeId:randomUUID(),expiresAt:now+300000,resendAt:now+60000};
    if(!await this.challenges.reserve(phone,challenge))throw new OtpError('Wait 60 seconds before requesting another code.',429);
    try {
      if(!await this.call('',{mobile:phone.slice(1),template_id:this.templateId,otp_length:'6',otp_expiry:'5'},'POST'))throw new OtpError('Unable to send a code. Please try again.',503);
      return challenge;
    } catch(error) {
      await this.challenges.invalidate(challenge.challengeId);
      throw error;
    }
  }

  async verify(id:string,code:string):Promise<string> {
    if(!/^[0-9]{6}$/.test(code))throw new OtpError('Enter a valid six-digit code.');
    const phone=await this.challenges.attempt(id);
    if(!phone)throw new OtpError('Code expired or unavailable. Request a new code.');
    if(!await this.call('/verify',{mobile:phone.slice(1),otp:code},'GET'))throw new OtpError('Incorrect or expired code. Please try again.');
    if(!await this.challenges.consume(id))throw new OtpError('Code expired or unavailable. Request a new code.');
    return phone;
  }
}
