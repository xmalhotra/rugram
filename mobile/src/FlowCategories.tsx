import React from 'react';
import type {HabitFlow,MobilePayload} from '../../shared/mobile';
import {focusOptions} from '../../shared/focus';
import {FlowTopicBrowser} from './FlowTopicBrowser';
export function FlowCategories({data,onSelect,initialCategory,busy=false,onRefresh}:{data:MobilePayload;onSelect:(flow:HabitFlow)=>void;initialCategory?:string;busy?:boolean;onRefresh?:()=>void}){
 const options=data.library?.focus??focusOptions.map(item=>({...item,flowIds:[...item.flowIds]}));
 return <FlowTopicBrowser standalone busy={busy} onRefresh={onRefresh} options={options} groups={data.library?.settings.flowCategoryGroups} library={data.flows} ownedIds={data.profile.flowIds} nutritionPaths={data.library?.nutrition} initialCategory={initialCategory} onSelect={onSelect}/>;
}
