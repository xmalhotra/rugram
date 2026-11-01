export function budgetCeiling(prices:readonly number[]):number{
  const max=Math.max(0,...prices.filter(price=>Number.isFinite(price)&&price>=0));
  if(max===0)return 5000;
  const step=10**Math.max(0,Math.floor(Math.log10(max))-1);
  return Math.ceil(max/step)*step;
}
export function budgetFromPosition(position:number,ceiling:number):number{
  const fraction=Math.max(0,Math.min(100,Number.isFinite(position)?position:100))/100;
  if(fraction===1)return ceiling;
  const amount=fraction*fraction*ceiling;
  const step=amount<1000?10:amount<10000?100:1000;
  return Math.min(ceiling,Math.round(amount/step)*step);
}
