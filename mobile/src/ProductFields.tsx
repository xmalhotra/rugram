import React from 'react';
import {pickCategories,techCategories,pickUseCaseLabels,type PickUseCase} from '../../shared/mobile';
import {gymSupports} from '../../shared/gym-supports';
import {Badge,Choice,Field} from './design/components';
import {PurchaseFields} from './PurchaseFields';
import type {AppSettings} from '../../shared/admin-content';
export function ProductFields({form,onChange,settings}:{settings?:AppSettings;form:Record<string,string>;onChange:(changes:Record<string,string>)=>void}){
  const categories=settings?.productCategories??pickCategories.map(id=>({id,title:id,subcategories:id==='Tech'?[...techCategories]:[]}));
  const tags:PickUseCase[]=form.category==='Tech'?['focus-audio','activity-tracking']:['pre-workout-drink','breakfast'];
  const support=gymSupports.find(item=>item.id===form.equipmentType)??gymSupports[0];
  return <>
    {[['title','Product name'],['summary','Why it is useful'],['packLabel','Pack size / unit'],['safetyNote','Suitability note']].map(([key,label])=><Field key={key} label={label} maxLength={key==='title'?100:key==='summary'?800:key==='safetyNote'?500:120} multiline={key==='summary'||key==='safetyNote'} value={form[key]??''} onChange={value=>onChange({[key]:value})}/>)}
    <PurchaseFields form={form} onChange={onChange}/>
    <Choice label="Category" value={categories.find(category=>category.id===(form.category??'Food'))?.title??''} options={categories.map(category=>category.title)} onChange={title=>{const category=categories.find(category=>category.title===title)!.id;onChange({category,subcategory:category==='Tech'?(categories.find(category=>category.id==='Tech')?.subcategories[0]??'Electronics'):'',equipmentType:category==='Equipment'?'lifting-belt':'',useCase:''});}}/>
    {form.category==='Tech'&&<Choice label="Tech type" value={form.subcategory??'Electronics'} options={categories.find(category=>category.id==='Tech')?.subcategories??techCategories} onChange={subcategory=>onChange({subcategory})}/>}
    {form.category==='Equipment'?<><Choice label="Equipment type" value={support.title} options={gymSupports.map(item=>item.title)} onChange={title=>onChange({equipmentType:gymSupports.find(item=>item.title===title)!.id})}/><Badge>Linked to the matching {support.title.toLowerCase()} habit. Do not claim injury prevention without appropriate evidence.</Badge></>:<Choice label="Related habit" value={tags.includes(form.useCase as PickUseCase)?pickUseCaseLabels[form.useCase as PickUseCase]:'None'} options={['None',...tags.map(tag=>pickUseCaseLabels[tag])]} onChange={label=>onChange({useCase:tags.find(tag=>pickUseCaseLabels[tag]===label)??''})}/>}
    <Choice label="Value tier" value={form.tier??'Essential'} options={settings?.tiers??['Essential','Upgrade','Premium']} onChange={tier=>onChange({tier})}/>
  </>;
}
