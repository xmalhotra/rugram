import type {StoryGroup} from './home-feed';
// Give longer text more reading time, without turning short stories into a wait.
export function storyDuration(text:string){return Math.min(15000,Math.max(6000,text.trim().split(/\s+/).filter(Boolean).length*300));}
export function storyElapsed(elapsed:number,delta:number,duration:number,paused:boolean){return Math.min(duration,Math.max(0,elapsed)+(paused?0:Math.max(0,Number.isFinite(delta)?delta:0)));}
export function storySwipe(dx:number,dy:number,vx:number):1|-1|null{
  if(![dx,dy,vx].every(Number.isFinite)||Math.abs(dx)<20||Math.abs(dx)<Math.abs(dy)*1.5)return null;
  if(Math.abs(dx)<50&&Math.abs(vx)<0.35)return null;
  return dx<0?1:-1;
}
export function swipeStoryGroup(groups:StoryGroup[],groupId:string,direction:1|-1){
  const available=groups.filter(group=>group.cards.length);const at=available.findIndex(group=>group.id===groupId);if(at<0)return null;
  if(direction===-1&&at===0)return {groupId,index:0};
  const next=available[at+direction];return next?{groupId:next.id,index:0}:null;
}
