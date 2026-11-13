import React,{useState} from 'react';
import {View} from 'react-native';
import {Text} from './design/Text';
import {Button,Card,Field} from './design/components';
import {useTheme} from './design/theme';
export function CreatorEventSettings({busy,onSave}:{busy:boolean;onSave:(handle:string,limit:number)=>Promise<boolean>}){
  const [handle,setHandle]=useState('');const [limit,setLimit]=useState('2');const {colors:C}=useTheme();
  const valid=handle.trim().length>0&&/^\d+$/.test(limit)&&Number(limit)<=100;
  return <Card><Text variant="section" style={{color:C.text}}>Creator event permissions</Text><Text variant="callout" style={{color:C.muted}}>Default: 2 submissions per India calendar month. Pending, approved and rejected submissions count. Set 0 to disable submissions. This does not grant admin permissions.</Text><Field label="Creator username (without @)" value={handle} onChange={setHandle}/><Field label="Monthly event allowance (0–100)" value={limit} onChange={setLimit} numeric/><View><Button title="Save creator allowance" disabled={busy||!valid} onPress={()=>void onSave(handle.trim().replace(/^@/,''),Number(limit))}/></View></Card>;
}
