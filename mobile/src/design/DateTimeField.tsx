import {formatEventTime} from '../../../shared/format';
import React from 'react';
import {Platform,View} from 'react-native';
import {Text} from './Text';
import DateTimePicker,{DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {Button,Host} from '@expo/ui';
import {useTheme,space,type} from './theme';
export function DateTimeField({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}){
  const {colors:C,scheme}=useTheme();const date=value && !Number.isNaN(Date.parse(value)) ? new Date(value) : new Date(Date.now()+86400000);
  function chooseAndroid(){DateTimePickerAndroid.open({value:date,mode:'date',minimumDate:new Date(),onChange:(event,selected)=>{if(event.type!=='set'||!selected)return;DateTimePickerAndroid.open({value:date,mode:'time',onChange:(timeEvent,time)=>{if(timeEvent.type!=='set'||!time)return;const combined=new Date(selected);combined.setHours(time.getHours(),time.getMinutes(),0,0);onChange(combined.toISOString());}});}});}
  return <View style={{gap:space.sm,marginVertical:space.sm}}><Text style={{color:C.muted,fontSize:type.footnote}}>{label}</Text>{Platform.OS==='ios' ? <DateTimePicker accessibilityLabel={label} value={date} mode="datetime" display="compact" themeVariant={scheme} minimumDate={new Date()} onChange={(event,selected)=>{if(event.type==='set'&&selected)onChange(selected.toISOString());}}/> : <Host colorScheme={scheme} seedColor={C.lime} matchContents><Button label={formatEventTime(date)} variant="outlined" onPress={chooseAndroid}/></Host>}<Text style={{color:C.muted,fontSize:type.caption}}>Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</Text></View>;
}
