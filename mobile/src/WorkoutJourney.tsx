import React,{useState} from 'react';
import {Pressable,View} from 'react-native';
import {Text} from './design/Text';
import type {HabitFlow,MobilePayload} from '../../shared/mobile';
import {Button,Card} from './design/components';
import {ExerciseSequence} from './ExerciseSequence';
import {ExerciseThumbnail} from './ExerciseThumbnail';
import {ExerciseLibrary} from './ExerciseLibrary';
import {useTheme} from './design/theme';
import {Disclosure} from './Disclosure';
import {HealthNote} from './OutboundLink';
export function WorkoutJourney({flow,data,onLink}:{flow:HabitFlow;data:MobilePayload;onLink:(url:string)=>void}){
  const {colors:C}=useTheme();const [showLibrary,setShowLibrary]=useState(false);const [selectedIndex,setSelectedIndex]=useState<number|null>(null);const plan=flow.workout!;
  const movements=plan.blocks.flatMap(block=>{const exercise=data.exercises.find(item=>item.id===block.exerciseId);return exercise?[exercise]:[];});
  return <View style={{gap:18}}>
    <HealthNote/>
    <Text accessibilityRole="header" style={{color:C.text,fontSize:22,lineHeight:29,fontWeight:'600'}}>Your movement sequence</Text>
    <Text style={{color:C.muted,fontSize:15,lineHeight:22}}>Open a movement. Swipe through the guide at your pace.</Text>
    {movements.map((exercise,index)=><Pressable key={exercise.id} accessibilityRole="button" accessibilityLabel={`Open movement ${index+1}: ${exercise.name}`} onPress={()=>setSelectedIndex(index)}><Card><View style={{flexDirection:'row',alignItems:'center',gap:12}}><ExerciseThumbnail icon={exercise.icon}/><View style={{flex:1,minWidth:0,gap:5}}><Text style={{color:C.muted,fontSize:12}}>MOVEMENT {index+1}</Text><Text style={{color:C.text,fontSize:18,lineHeight:25,fontWeight:'600'}}>{exercise.name}</Text><Text style={{color:C.muted,fontSize:13}}>{exercise.muscles.join(' · ')}</Text></View><Text style={{color:C.lime,fontSize:24}}>›</Text></View></Card></Pressable>)}
    {movements.length<plan.blocks.length&&<Text style={{color:C.muted,fontSize:14}}>Some movement guides are unavailable.</Text>}
    {selectedIndex!==null&&movements.length>0&&<ExerciseSequence exercises={movements} initialIndex={selectedIndex} onClose={()=>setSelectedIndex(null)} onLink={onLink}/>}
    <Text style={{color:C.muted,fontSize:13,lineHeight:20}}>Illustrations are simplified position reminders, not complete form demonstrations. Stop for pain and seek coaching when needed.</Text>
    <Disclosure title="What this guide covers">{plan.benefits.map(benefit=><Text key={benefit} style={{color:C.muted,fontSize:16,lineHeight:24}}>{benefit}</Text>)}<Text style={{color:C.muted,fontSize:14,lineHeight:22}}>{plan.safety}</Text></Disclosure>
    <Button title={showLibrary?'Close movement library':'Explore more movements'} secondary onPress={()=>setShowLibrary(value=>!value)}/>
    {showLibrary&&<ExerciseLibrary library={data.exercises} onLink={onLink}/>}
  </View>;
}
