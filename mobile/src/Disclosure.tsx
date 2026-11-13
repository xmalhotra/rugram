import React,{useState} from 'react';
import {Pressable,StyleSheet,View} from 'react-native';
import {Text} from './design/Text';
import {opacity,size,space,useTheme} from './design/theme';
export function Disclosure({title,children,initiallyOpen=false}:{title:string;children:React.ReactNode;initiallyOpen?:boolean}){
  const [open,setOpen]=useState(initiallyOpen);const {colors:C}=useTheme();
  return <View style={{borderTopWidth:StyleSheet.hairlineWidth,borderColor:C.line,gap:open?space.ms:0}}>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:open}} accessibilityLabel={title} onPress={()=>setOpen(value=>!value)} style={({pressed})=>({minHeight:size.button,paddingVertical:space.ms,flexDirection:'row',gap:space.ms,alignItems:'center',opacity:pressed?opacity.pressed:1})}>
      <Text variant="headline" style={{flex:1,minWidth:0,color:C.text}}>{title}</Text><Text accessibilityElementsHidden variant="heading" style={{color:C.lime}}>{open?'−':'+'}</Text>
    </Pressable>
    {open&&<View style={{gap:space.ms,paddingBottom:space.ms}}>{children}</View>}
  </View>;
}
