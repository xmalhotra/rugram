export type OtpChallenge = {challengeId:string;expiresAt:number;resendAt:number;mockCode?:string;otpLength?:4|6};
export function indianMobileInput(value:string):string {
  const digits=value.replace(/\D/g,'');
  return digits.length===12&&digits.startsWith('91')?digits.slice(2):digits.slice(0,10);
}
export function indianMobilePhone(value:string):string|null {
  return /^[6-9]\d{9}$/.test(value)?`+91${value}`:null;
}
// Reserved fictional US numbers, never real SMS recipients.
export const mockPhoneAccounts = [
  {phone:'+12025550101',handle:'john',label:'John'},
  {phone:'+12025550102',handle:'creator',label:'Creator'},
  {phone:'+12025550103',handle:'admin',label:'Admin'},
] as const;
