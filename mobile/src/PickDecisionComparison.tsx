import React from 'react';
import {Image,Pressable,View} from 'react-native';
import type {Product} from '../../shared/mobile';
import {decisionLine} from '../../shared/pick-decision';
import {comparisonRows} from '../../shared/pick-comparison';
import {buyingComparison,newcomerDecision} from '../../shared/pick-buying';
import {Text} from './design/Text';
import {useTheme} from './design/theme';
import {affiliateSeller,purchaseDestination,sellerPriceLabel,sortedPurchaseOptions} from '../../shared/purchases';
export function PickDecisionComparison({product,other,onAlternative,onLink}:{product:Product;other:Product;onAlternative:(product:Product)=>void;onLink:(url:string)=>void}){
 const {colors:C}=useTheme();const products=[product,other];
 const supplement=products.some(item=>item.category==='Supplements');
 const rows=supplement?buyingComparison(products):comparisonRows(products).filter(row=>!['Price basis','Colour','Color','Variant','Model'].includes(row.label)&&row.values.every(value=>value!=='Not recorded'&&value.length<=75)).slice(0,3);
 return <View style={{gap:16}}>
  <View style={{flexDirection:'row',gap:10,alignItems:'stretch'}}>{products.map(item=>{const seller=sortedPurchaseOptions(item.purchaseOptions??[]).find(option=>option.availability!=='out-of-stock');return <View key={item.id} style={{flex:1,minWidth:0,borderRadius:18,padding:12,backgroundColor:C.card,gap:10}}>
   <Pressable accessibilityRole="button" accessibilityLabel={`View ${item.title}`} onPress={()=>onAlternative(item)} style={{gap:10,minHeight: 48}}><Image source={{uri:item.imageUrl}} resizeMode="contain" style={{height:110,width:'100%',backgroundColor:C.photoMat,borderRadius:12}}/><Text style={{color:C.text,fontSize:16,fontWeight:'600'}}>{item.title}</Text></Pressable>
   <Text style={{color:C.muted,fontSize:13,lineHeight:19}}>{decisionLine(item.assessment?.bestFor??item.summary,95)}</Text>
   {seller&&<Pressable accessibilityRole="link" accessibilityLabel={`${item.title}, ${seller.sellerName}, ${sellerPriceLabel(seller)}, opens seller`} onPress={()=>onLink(purchaseDestination(seller))} style={{minHeight: 48,gap:4,justifyContent:'center'}}><Text style={{color:C.lime,fontSize:16,fontWeight:'600'}}>{sellerPriceLabel(seller)} ↗</Text><Text numberOfLines={1} style={{color:C.muted,fontSize:11}}>{seller.sellerName}</Text>{affiliateSeller(seller)&&<Text style={{color:C.muted,fontSize:10}}>Affiliate link</Text>}</Pressable>}
  </View>;})}</View>
  {rows.map(row=><View key={row.label} style={{gap:8,borderBottomWidth:1,borderColor:C.line,paddingBottom:10}}><Text style={{color:C.lime,fontSize:12}}>{row.label}</Text><View style={{flexDirection:'row',gap:12}}>{row.values.map((value,index)=><Text key={index} style={{flex:1,color:C.text,fontSize:14,lineHeight:20}}>{value}</Text>)}</View></View>)}
  <Text style={{color:C.muted,fontSize:12,lineHeight:18}}>{supplement?newcomerDecision(product):rows.length?'Listed specifications, not a hands-on verdict.':'Comparable specifications are not verified yet. No winner claimed.'}</Text>
  <Text style={{color:C.muted,fontSize:11}}>Dated prices · confirm stock and checkout total.</Text>
 </View>;
}
