import React,{useState} from 'react';
import {View} from 'react-native';
import {Text} from './design/Text';
import type {Exercise,ExerciseCategory,ExercisePrescription} from '../../shared/exercises';
import {Badge,Button,Card,Choice,Field,HabitToggle} from './design/components';
import {ExerciseThumbnail} from './ExerciseThumbnail';
import {useTheme} from './design/theme';

export function WorkoutBuilder({library,busy,onSubmit}:{library:Exercise[];busy:boolean;onSubmit:(input:unknown)=>Promise<boolean>}){
  const {colors:C}=useTheme();const [title,setTitle]=useState('');const [description,setDescription]=useState('');const [benefit,setBenefit]=useState('');
  const [category,setCategory]=useState<ExerciseCategory|'All'>('All');const [blocks,setBlocks]=useState<ExercisePrescription[]>([]);
  const [requestId]=useState(()=>`workout-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const text={color:C.muted,fontSize:16,lineHeight:24} as const;const heading={color:C.text,fontSize:20,fontWeight:'600'} as const;
  function update(index:number,change:Partial<ExercisePrescription>){setBlocks(previous=>previous.map((block,i)=>i===index?{...block,...change} as ExercisePrescription:block));}
  function add(exercise:Exercise){const common={exerciseId:exercise.id,sets:2,restSeconds:60,perSide:['dead-bug','bird-dog','side-plank-knees'].includes(exercise.id)};setBlocks(previous=>[...previous,['plank','side-plank'].includes(exercise.icon)?{...common,mode:'hold',seconds:10}:{...common,mode:'reps',reps:6}]);}
  const valid=title.trim().length>=3 && description.trim().length>=10 && benefit.trim().length>=5 && blocks.length>0;
  return <View style={{gap:16}}>
    <Text style={text}>Build from central exercise entries. Technique and illustrations stay in the library; this flow stores the order and example dose. Publishing is admin-only.</Text>
    <Field label="Flow title (3–100 characters)" value={title} onChange={setTitle}/>
    <Field label="Who it is for / description (10–500 characters)" value={description} onChange={setDescription}/>
    <Field label="Intended practice benefit (5–160 characters)" value={benefit} onChange={setBenefit}/>
    <Badge>Use realistic practice goals, not guaranteed results or medical claims.</Badge>
    <Text style={heading}>Your sequence · {blocks.length} exercises</Text>
    {blocks.length===0 && <Text style={text}>Pick an exercise below to start.</Text>}
    {blocks.map((block,index)=>{const exercise=library.find(item=>item.id===block.exerciseId)!;return <Card key={block.exerciseId}>
      <View style={{flexDirection:'row',gap:12,alignItems:'center'}}><ExerciseThumbnail icon={exercise.icon}/><Text style={[heading,{flex:1}]}>{index+1}. {exercise.name}</Text></View>
      <Choice label="Sets" value={String(block.sets)} options={['1','2','3','4','5']} onChange={value=>update(index,{sets:Number(value)})}/>
      {block.mode==='reps'?<Choice label="Repetitions in each set" value={String(block.reps)} options={['4','6','8','10','12']} onChange={value=>update(index,{reps:Number(value)})}/>:<Choice label="Seconds in each hold" value={String(block.seconds)} options={['5','10','15','20','30']} onChange={value=>update(index,{seconds:Number(value)})}/>}
      <Choice label="Rest between sets (seconds)" value={String(block.restSeconds)} options={['30','60','90','120']} onChange={value=>update(index,{restSeconds:Number(value)})}/>
      <HabitToggle title="Complete the dose on each side" detail="Check one set only after both sides when enabled." checked={block.perSide} disabled={busy} onChange={value=>update(index,{perSide:value})}/>
      {index>0 && <Button title="Move earlier" secondary disabled={busy} onPress={()=>setBlocks(previous=>{const next=[...previous];[next[index-1],next[index]]=[next[index],next[index-1]];return next;})}/>}
      <Button title="Remove exercise" secondary disabled={busy} onPress={()=>setBlocks(previous=>previous.filter((_,i)=>i!==index))}/>
    </Card>;})}
    <Text style={heading}>Exercise library</Text>
    <Choice label="Category" value={category} options={['All','Core','Lower body','Upper body']} onChange={setCategory}/>
    {library.filter(exercise=>category==='All'||exercise.category===category).map(exercise=><Card key={exercise.id}><View style={{flexDirection:'row',gap:12,alignItems:'center'}}><ExerciseThumbnail icon={exercise.icon}/><View style={{flex:1}}><Text style={heading}>{exercise.name}</Text><Text style={text}>{exercise.category} · {exercise.equipment}</Text></View></View><Button title={blocks.some(block=>block.exerciseId===exercise.id)?'In your sequence':'Add exercise'} secondary disabled={busy||blocks.length>=12||blocks.some(block=>block.exerciseId===exercise.id)} onPress={()=>add(exercise)}/></Card>)}
    <Text style={text}>Preparation, progression guidance and a reflection step are included automatically. Publishing does not validate the programme clinically.</Text>
    <Button title={busy?'Publishing…':'Publish flow'} disabled={busy||!valid||title.trim().length>100||description.trim().length>500||benefit.trim().length>160} onPress={()=>void onSubmit({action:'workout-flow',requestId,workout:{title,description,benefits:[benefit],blocks}})}/>
  </View>;
}
