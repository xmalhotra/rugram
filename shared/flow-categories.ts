export type FlowCategoryGroup={id:string;title:string;illustration:string;focusIds:string[]};
export const defaultFlowCategoryGroups:FlowCategoryGroup[]=[
 {id:'fitness',title:'Fitness',illustration:'workout',focusIds:['workout','running','hyrox','supplements']},
 {id:'tech',title:'Tech',illustration:'coding',focusIds:['coding']},
 {id:'lifestyle',title:'Lifestyle',illustration:'sleep',focusIds:['morning-drinks','sleep']},
 {id:'nutrition',title:'Nutrition',illustration:'nutrition',focusIds:['nutrition']},
];
export function flowCategoryGroups(options:readonly {id:string}[],configured=defaultFlowCategoryGroups){
 options=options.filter(option=>option.id!=='crossfit');
 const ids=new Set(options.map(option=>option.id));const assigned=new Set<string>();
 // Older settings predate Morning drinks. Keep the new topic in Lifestyle,
 // unless an editor has explicitly assigned it elsewhere.
 if(ids.has('morning-drinks')&&!configured.some(group=>group.focusIds.includes('morning-drinks')))
  configured=configured.map(group=>group.id==='lifestyle'?{...group,focusIds:['morning-drinks',...group.focusIds]}:group);
 if(ids.has('supplements')&&!configured.some(group=>group.focusIds.includes('supplements')))
  configured=configured.map(group=>group.id==='fitness'?{...group,focusIds:[...group.focusIds,'supplements']}:group);
 const groups=configured.map(group=>({...group,focusIds:group.focusIds.filter(id=>{if(!ids.has(id)||assigned.has(id))return false;assigned.add(id);return true;})})).filter(group=>group.focusIds.length);
 const remaining=options.filter(option=>!assigned.has(option.id)).map(option=>option.id);
 return remaining.length?[...groups,{id:'other-topics',title:'More topics',illustration:'focus',focusIds:remaining}]:groups;
}
