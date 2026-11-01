import React,{useState} from 'react';
import {Pressable,View} from 'react-native';
import {Text} from './design/Text';
import {useTheme} from './design/theme';
export function Disclosure({title,children,initiallyOpen=false}:{title:string;children:React.ReactNode;initiallyOpen?:boolean}){
  const [open,setOpen]=useState(initiallyOpen);const {colors:C}=useTheme();
  return <View style={{borderTopWidth:0.5,borderColor:C.line,gap:open?12:0}}>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:open}} accessibilityLabel={title} onPress={()=>setOpen(value=>!value)} style={({pressed})=>({minHeight:52,paddingVertical:12,flexDirection:'row',gap:12,alignItems:'center',opacity:pressed?0.6:1})}>
      <Text style={{flex:1,minWidth:0,fontSize:17,fontWeight:'600',color:C.text}}>{title}</Text><Text accessibilityElementsHidden style={{fontSize:22,color:C.lime}}>{open?'−':'+'}</Text>
    </Pressable>
    {open&&<View style={{gap:12,paddingBottom:12}}>{children}</View>}
  </View>;
}
