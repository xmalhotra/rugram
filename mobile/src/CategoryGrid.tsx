import React from 'react';
import {Pressable,View} from 'react-native';
import {Text} from './design/Text';
import {FocusIllustration} from './FocusIllustration';
import {opacity,radius,space,useTheme} from './design/theme';
export type CategoryTile={id:string;title:string;illustration:string};
export function CategoryGrid({items,onSelect}:{items:readonly CategoryTile[];onSelect:(id:string)=>void}){
  const {colors:C}=useTheme();
  return <View style={{flexDirection:'row',flexWrap:'wrap',columnGap:'4%',rowGap:space.md}}>{items.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Explore ${item.title}`} onPress={()=>onSelect(item.id)} style={({pressed})=>({width:'48%',minHeight:176,padding:space.md,borderRadius:radius.card,borderWidth:1,borderColor:C.line,backgroundColor:C.card,alignItems:'center',justifyContent:'center',gap:space.ms,opacity:pressed?opacity.pressed:1})}><FocusIllustration focusId={item.illustration}/><Text variant="section" style={{color:C.text,textAlign:'center',width:'100%'}}>{item.title}</Text></Pressable>)}</View>;
}
