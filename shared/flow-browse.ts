import type {MobileProfile} from './mobile';
export function needsFocusOnboarding(profile:Pick<MobileProfile,'focusId'|'flowIds'|'personalFlows'>){
  // Choosing a focus isn't completion: the user still needs to add a first flow.
  return profile.flowIds.length===0 && !profile.personalFlows?.some(flow=>flow.cards.length>0);
}
