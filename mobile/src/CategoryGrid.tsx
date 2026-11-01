import React from 'react';
import {Pressable,View} from 'react-native';
import {Text} from './design/Text';
import {FocusIllustration} from './FocusIllustration';
import {useTheme} from './design/theme';
export type CategoryTile={id:string;title:string;illustration:string};
export function CategoryGrid({items,onSelect}:{items:readonly CategoryTile[];onSelect:(id:string)=>void}){
  const {colors:C}=useTheme();
  return <View style={{flexDirection:'row',flexWrap:'wrap',columnGap:'4%',rowGap:14}}>{items.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Explore ${item.title}`} onPress={()=>onSelect(item.id)} style={({pressed})=>({width:'48%',minHeight:176,padding:16,borderRadius:20,borderWidth:1,borderColor:C.line,backgroundColor:C.card,alignItems:'center',justifyContent:'center',gap:12,opacity:pressed?0.7:1})}><FocusIllustration focusId={item.illustration}/><Text style={{color:C.text,fontSize:20,fontWeight:'600',lineHeight:26,textAlign:'center',width:'100%'}}>{item.title}</Text></Pressable>)}</View>;
}
