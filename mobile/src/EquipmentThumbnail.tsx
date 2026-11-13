import React from 'react';
import {View} from 'react-native';
import type {SupportKind} from '../../shared/gym-supports';
import {radius, useTheme} from './design/theme';
export function EquipmentThumbnail({kind}:{kind:SupportKind}){
  const {colors:C}=useTheme();const line={position:'absolute' as const,borderColor:C.lime,borderWidth:3};
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{width:64,height:64,borderRadius:radius.control,backgroundColor:C.bg,overflow:'hidden'}}>
    {kind==='lifting-belt'&&<><View style={[line,{left:6,top:22,width:52,height:23,borderRadius:radius.small}]}/><View style={[line,{left:26,top:25,width:13,height:17,borderRadius:2}]}/></>}
    {kind==='wrist-wraps'&&<><View style={[line,{left:22,top:7,width:20,height:50,borderRadius:radius.small,borderColor:C.line}]}/>{[24,31,38].map(top=><View key={top} style={[line,{left:15,top,width:34,height:8,borderRadius:3}]}/>)}</>}
    {kind==='lifting-straps'&&<><View style={[line,{left:12,top:9,width:25,height:20,borderRadius:radius.small}]}/><View style={[line,{left:28,top:24,width:13,height:30,borderRadius:5,transform:[{rotate:'-25deg'}]}]}/><View style={{position:'absolute',left:7,top:43,width:50,height:4,borderRadius:2,backgroundColor:C.text}}/></>}
    {kind==='knee-sleeves'&&<><View style={[line,{left:18,top:8,width:28,height:47,borderRadius:radius.small,transform:[{rotate:'-12deg'}]}]}/><View style={[line,{left:19,top:26,width:25,height:12,borderRadius:radius.small,borderColor:C.text}]}/></>}
  </View>;
}
