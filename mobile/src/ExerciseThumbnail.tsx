import React from 'react';
import {View} from 'react-native';
import type {ExerciseIcon} from '../../shared/exercises';
import {useTheme} from './design/theme';
type Line=[number,number,number,number];
const poses:Record<ExerciseIcon,{head:[number,number];lines:Line[]}>= {
  'dead-bug':{head:[13,44],lines:[[21,46,39,46],[24,45,24,23],[24,45,10,30],[39,46,40,28],[40,28,56,28],[39,46,54,50]]},
  'bird-dog':{head:[14,28],lines:[[21,33,41,33],[23,33,7,33],[23,33,25,51],[41,33,57,27],[41,33,41,50],[41,50,51,52]]},
  plank:{head:[14,26],lines:[[21,31,42,44],[23,32,19,48],[19,48,30,50],[42,44,48,51],[48,51,58,48]]},
  'side-plank':{head:[14,26],lines:[[21,31,41,44],[23,32,19,50],[19,50,27,50],[41,44,52,50],[41,44,46,53],[23,32,34,24]]},
  bridge:{head:[11,49],lines:[[18,49,33,34],[33,34,46,38],[46,38,55,52],[18,49,29,51]]},
  squat:{head:[30,14],lines:[[30,22,24,36],[24,36,43,40],[43,40,38,54],[30,26,47,25],[38,54,49,54]]},
  push:{head:[44,16],lines:[[40,24,25,44],[40,26,52,27],[52,27,57,20],[25,44,18,53],[18,53,9,53]]},
  calf:{head:[34,12],lines:[[34,20,34,37],[34,37,31,52],[31,52,39,55],[34,25,50,27]]},
};
export function ExerciseThumbnail({icon,size=68}:{icon:ExerciseIcon;size?:number}){
  const {colors:C}=useTheme();const pose=poses[icon]??poses.plank;
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{width:size,height:size,alignItems:'center',justifyContent:'center',overflow:'hidden'}}><View style={{width:68,height:68,borderRadius:14,backgroundColor:C.bg,transform:[{scale:size/68}]}}>
    <View style={{position:'absolute',left:7,right:7,top:58,height:1,backgroundColor:C.line}}/>
    {pose.lines.map(([x1,y1,x2,y2],index)=>{const length=Math.hypot(x2-x1,y2-y1);return <View key={index} style={{position:'absolute',left:(x1+x2)/2-length/2,top:(y1+y2)/2-1.5,width:length,height:3,borderRadius:2,backgroundColor:C.lime,transform:[{rotate:`${Math.atan2(y2-y1,x2-x1)}rad`}]}}/>;})}
    <View style={{position:'absolute',left:pose.head[0]-4,top:pose.head[1]-4,width:8,height:8,borderRadius:4,backgroundColor:C.text}}/>
  </View></View>;
}
