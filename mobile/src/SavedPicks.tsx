import React from 'react';
import {Image,Pressable,View} from 'react-native';
import {Text} from './design/Text';
import type {MobilePayload,Product} from '../../shared/mobile';
import {savedPicks} from '../../shared/saved-picks';
import {Card} from './design/components';
import {FocusIllustration} from './FocusIllustration';
import {useTheme} from './design/theme';
export function SavedPicks({data,onPick}:{data:MobilePayload;onPick:(product:Product)=>void}){
  const {colors:C}=useTheme();const saved=savedPicks(data);
  return <View style={{gap:12}}>
    {saved.count===0&&<Text style={{color:C.muted,fontSize:16,lineHeight:24}}>Save a Pick you like. You’ll find it here.</Text>}
    {saved.products.map(product=><Pressable key={product.id} accessibilityRole="button" accessibilityLabel={`Open saved Pick ${product.title}`} onPress={()=>onPick(product)} style={({pressed})=>({opacity:pressed?0.7:1})}><Card><View style={{flexDirection:'row',gap:14,alignItems:'center'}}>{product.imageUrl?<View style={{backgroundColor:C.photoMat,borderRadius:14,padding:4}}><Image source={{uri:product.imageUrl}} accessibilityLabel={product.title} resizeMode="contain" style={{width:64,height:76}}/></View>:<FocusIllustration focusId={product.category==='Food'?'nutrition':product.category==='Tech'?'coding':'supplements'}/>}<View style={{flex:1,minWidth:0,gap:5}}><Text style={{color:C.text,fontSize:18,fontWeight:'600'}}>{product.title}</Text>{product.variantLabel&&<Text numberOfLines={2} style={{color:C.muted,fontSize:14,lineHeight:20}}>{product.variantLabel}</Text>}<Text style={{color:C.muted,fontSize:12}}>{product.category}{product.status!=='published'?' · No longer listed':''}</Text></View><Text style={{color:C.muted,fontSize:24}}>›</Text></View></Card></Pressable>)}
    {saved.unavailable>0&&<Text style={{color:C.muted,fontSize:14,lineHeight:21}}>{saved.unavailable} saved {saved.unavailable===1?'Pick is':'Picks are'} currently unavailable.</Text>}
  </View>;
}
