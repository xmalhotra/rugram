import React from 'react';
import type {NutritionPath} from '../../shared/admin-content';
import type {HabitFlow} from '../../shared/mobile';
import {focusOptions,type FocusId} from '../../shared/focus';
import type {FlowCategoryGroup} from '../../shared/flow-categories';
import {FlowTopicBrowser} from './FlowTopicBrowser';
export function FlowDiscovery({nutritionPaths,groups,options=focusOptions,library,ownedIds,busy,onFocus,onSelect}:{nutritionPaths?:NutritionPath[];groups?:FlowCategoryGroup[];options?:readonly {id:string;title:string;description:string;flowIds:readonly string[]}[];library:HabitFlow[];ownedIds:string[];busy:boolean;onFocus:(id:FocusId)=>Promise<boolean|undefined>;onSelect:(flow:HabitFlow)=>void}){
 return <FlowTopicBrowser options={options.map(item=>({...item,flowIds:[...item.flowIds]}))} groups={groups} library={library} ownedIds={ownedIds} nutritionPaths={nutritionPaths} busy={busy} onSelect={(flow,focusId)=>{void onFocus(focusId).then(saved=>{if(saved)onSelect(flow);});}}/>;
}
