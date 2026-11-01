export function deckPage(offset:number,width:number,count:number){
  if(!Number.isFinite(offset)||!Number.isFinite(width)||width<=0||!Number.isFinite(count)||count<1)return 0;
  return Math.max(0,Math.min(Math.floor(count)-1,Math.round(offset/width)));
}
