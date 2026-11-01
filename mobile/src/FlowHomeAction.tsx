import React from 'react';
import {ActivityIndicator,Pressable,View} from 'react-native';
import {Text} from './design/Text';
import {useTheme} from './design/theme';

export function FlowHomeAction({added,busy,onAdd,onHome,onRemove}:{added:boolean;busy:boolean;onAdd:()=>void;onHome:()=>void;onRemove:()=>void}){
 const {colors:C}=useTheme();
 return <View style={{gap:4}}><Pressable accessibilityRole="button" accessibilityLabel={added?'View flow on Home':'Add flow to Home'} accessibilityState={{disabled:busy,busy}} disabled={busy} onPress={added?onHome:onAdd} style={({pressed})=>({width:'100%',minHeight:56,paddingHorizontal:20,paddingVertical:15,borderRadius:18,backgroundColor:C.lime,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:10,opacity:busy?0.6:pressed?0.8:1})}>
  {busy&&<ActivityIndicator color={C.onAccent}/>}
  <Text style={{color:C.onAccent,fontSize:17,lineHeight:24,fontWeight:'600',textAlign:'center',flexShrink:1}}>{busy?'Saving…':added?'View on Home →':'Add to Home'}</Text>
 </Pressable>{added&&<Pressable accessibilityRole="button" accessibilityLabel="Remove flow from Home" accessibilityState={{disabled:busy}} disabled={busy} onPress={onRemove} style={({pressed})=>({minHeight: 48,alignItems:'center',justifyContent:'center',opacity:busy?0.5:pressed?0.7:1})}><Text style={{color:C.muted,fontSize:14}}>Remove from Home</Text></Pressable>}</View>;
}
