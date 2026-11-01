import React from 'react';
import {View} from 'react-native';
import {Text} from './design/Text';
import type {Exercise} from '../../shared/exercises';
import {Badge,Button,Card} from './design/components';
import {ExerciseThumbnail} from './ExerciseThumbnail';
import {Disclosure} from './Disclosure';
import {useTheme} from './design/theme';
export function ExerciseTechniqueCard({exercise,onLink}:{exercise:Exercise;onLink:(url:string)=>void}){
  const {colors:C}=useTheme();
  return <Card>
    <View style={{alignItems:'center',paddingVertical:12,borderRadius:16,backgroundColor:C.bg}}><ExerciseThumbnail icon={exercise.icon} size={144}/></View>
    <Text accessibilityRole="header" style={{color:C.text,fontSize:22,lineHeight:29,fontWeight:'600'}}>{exercise.name}</Text>
    <Badge>{exercise.muscles.join(' · ')}</Badge>
    <Badge>{exercise.equipment}</Badge>
    <View style={{gap:14,paddingVertical:8}}>{exercise.instructions.map((instruction,index)=><View key={`${exercise.id}-${index}`} style={{flexDirection:'row',gap:12}}><Text style={{color:C.lime,fontSize:14,lineHeight:24,fontWeight:'600'}}>{String(index+1).padStart(2,'0')}</Text><Text style={{flex:1,minWidth:0,color:C.text,fontSize:16,lineHeight:24}}>{instruction}</Text></View>)}</View>
    <View style={{borderTopWidth:1,borderColor:C.line,paddingTop:12,gap:5}}><Text style={{color:C.lime,fontSize:13,fontWeight:'600'}}>FORM CHECK</Text><Text style={{color:C.muted,fontSize:15,lineHeight:22}}>{exercise.watchFor}</Text></View>
    <Disclosure title="Adaptation & source"><Text style={{color:C.muted,fontSize:15,lineHeight:23}}>{exercise.easier}</Text><Button title="Technique reference ↗" secondary onPress={()=>onLink(exercise.source.url)}/></Disclosure>
    {Boolean(exercise.recommendations?.some(item=>item.verified))&&<View style={{gap:10}}><Text style={{color:C.text,fontSize:18,fontWeight:'600'}}>Creator references</Text>{exercise.recommendations?.filter(item=>item.verified).map(item=><View key={`${item.name}-${item.sourceUrl}`} style={{gap:6}}><Text style={{color:C.text,fontSize:16}}>{item.name} · {item.claim}</Text><Text style={{color:C.muted,fontSize:14,lineHeight:21}}>{item.context}</Text><Text style={{color:C.muted,fontSize:13}}>{item.disclosure}</Text><Button title="View original reference ↗" secondary onPress={()=>onLink(item.sourceUrl)}/></View>)}</View>}
  </Card>;
}
