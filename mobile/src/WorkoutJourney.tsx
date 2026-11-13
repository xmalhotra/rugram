import React,{useState} from 'react';
import {Pressable,View} from 'react-native';
import {Text} from './design/Text';
import type {HabitFlow,MobilePayload} from '../../shared/mobile';
import {Button,Card,SectionHeader} from './design/components';
import {Glyph} from './design/Glyph';
import {ExerciseSequence} from './ExerciseSequence';
import {ExerciseThumbnail} from './ExerciseThumbnail';
import {ExerciseLibrary} from './ExerciseLibrary';
import {space, useTheme} from './design/theme';
import {Disclosure} from './Disclosure';
import {HealthNote} from './OutboundLink';
export function WorkoutJourney({flow,data,onLink}:{flow:HabitFlow;data:MobilePayload;onLink:(url:string)=>void}){
  const {colors:C}=useTheme();const [showLibrary,setShowLibrary]=useState(false);const [selectedIndex,setSelectedIndex]=useState<number|null>(null);const plan=flow.workout!;
  const movements=plan.blocks.flatMap(block=>{const exercise=data.exercises.find(item=>item.id===block.exerciseId);return exercise?[exercise]:[];});
  return <View style={{gap:space.md}}>
    <HealthNote/>
    <SectionHeader title="Your movement sequence" detail="Open a movement. Swipe through the guide at your pace." />
    {movements.map((exercise,index)=><Pressable key={exercise.id} accessibilityRole="button" accessibilityLabel={`Open movement ${index+1}: ${exercise.name}`} onPress={()=>setSelectedIndex(index)}><Card><View style={{flexDirection:'row',alignItems:'center',gap:space.ms}}><ExerciseThumbnail icon={exercise.icon}/><View style={{flex:1,minWidth:0,gap:space.xs}}><Text variant="caption" style={{color:C.muted}}>MOVEMENT {index+1}</Text><Text variant="headline" style={{color:C.text}}>{exercise.name}</Text><Text variant="footnote" style={{color:C.muted}}>{exercise.muscles.join(' · ')}</Text></View><Glyph name={{ios:'chevron.right',android:'chevron_right'}} fallback="›" color={C.text} size={space.xl} /></View></Card></Pressable>)}
    {movements.length<plan.blocks.length&&<Text variant="subhead" style={{color:C.muted}}>Some movement guides are unavailable.</Text>}
    {selectedIndex!==null&&movements.length>0&&<ExerciseSequence exercises={movements} initialIndex={selectedIndex} onClose={()=>setSelectedIndex(null)} onLink={onLink}/>}
    <Text variant="footnote" style={{color:C.muted}}>Illustrations are simplified position reminders, not complete form demonstrations. Stop for pain and seek coaching when needed.</Text>
    <Disclosure title="What this guide covers">{plan.benefits.map(benefit=><Text key={benefit} variant="callout" style={{color:C.muted}}>{benefit}</Text>)}<Text variant="subhead" style={{color:C.muted}}>{plan.safety}</Text></Disclosure>
    <Button title={showLibrary?'Close movement library':'Explore more movements'} secondary onPress={()=>setShowLibrary(value=>!value)}/>
    {showLibrary&&<ExerciseLibrary library={data.exercises} onLink={onLink}/>}
  </View>;
}
