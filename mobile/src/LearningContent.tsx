import React,{useEffect,useState} from 'react';
import {View} from 'react-native';
import {Text} from './design/Text';
import type {LearningGuide} from '../../shared/admin-content';
import {api} from './api';
import {costPer100mg} from '../../shared/magnesium';
import {Badge,Button,Card,Choice,Field} from './design/components';
import {useTheme} from './design/theme';
export function LearningContent({guide,onLink}:{guide:LearningGuide;onLink:(url:string)=>void}){
  useEffect(()=>{void api('/api/mobile',{action:'content-view',kind:'guide',id:guide.id}).catch(()=>{});},[guide.id]);
  const {colors:C}=useTheme();const [first,setFirst]=useState(guide.sections[0]?.id??'');const [second,setSecond]=useState(guide.sections[1]?.id??'');const [price,setPrice]=useState('');const [servings,setServings]=useState('');const [elemental,setElemental]=useState('');
  const copy={color:C.muted,fontSize:16,lineHeight:24} as const;const heading={color:C.text,fontSize:22,fontWeight:'600'} as const;
  const compare=guide.id==='magnesium';const ids=compare?[first,second]:guide.sections.map(section=>section.id);
  const cost=price&&servings&&elemental?costPer100mg(Number(price),Number(servings),Number(elemental)):null;
  return <View style={{gap:16}}><Text style={heading}>{guide.title}</Text><Text style={copy}>{guide.description}</Text>{compare&&[first,second].map((id,index)=><Choice key={index} label={`Compare option ${index+1}`} value={guide.sections.find(section=>section.id===id)?.title??'Choose'} options={guide.sections.map(section=>section.title)} onChange={title=>(index===0?setFirst:setSecond)(guide.sections.find(section=>section.title===title)!.id)}/>)}{ids.map((id,index)=>{const section=guide.sections.find(section=>section.id===id);return section?<Card key={`${id}-${index}`}><Text style={heading}>{section.title}</Text><Text style={copy}>{section.body}</Text><Button title="Read source ↗" secondary onPress={()=>onLink(section.sourceUrl)}/></Card>:null;})}{guide.references?.map(reference=><Card key={reference.url}><Badge>{reference.reviewStatus.toUpperCase()} REFERENCE</Badge><Text style={heading}>{reference.title}</Text><Text style={copy}>{reference.note}</Text><Button title="Open supplied reference ↗" secondary onPress={()=>onLink(reference.url)}/></Card>)}{guide.creatorReferences?.map(reference=><Card key={reference.profileUrl}><Badge>CREATOR CONTEXT · NOT SCIENTIFIC VALIDATION</Badge><Text style={heading}>{reference.name}</Text><Text style={copy}>{reference.note}</Text><Button title="Open creator profile ↗" secondary onPress={()=>onLink(reference.profileUrl)}/></Card>)}{compare&&<Card><Text style={heading}>Compare elemental content—not compound weight</Text><Field label="Pack price (INR)" value={price} onChange={setPrice} numeric/><Field label="Servings per pack" value={servings} onChange={setServings} numeric/><Field label="Elemental magnesium per serving (mg)" value={elemental} onChange={setElemental} numeric/>{cost!==null&&<Badge>₹{cost.toFixed(2)} per 100 mg elemental magnesium</Badge>}<Text style={copy}>A price calculation, not an absorption ranking or a dose recommendation. Missing label figures must not be estimated.</Text></Card>}</View>;
}
