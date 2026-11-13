import React from 'react';
import {Image,Pressable,View} from 'react-native';
import type {Product} from '../../shared/mobile';
import {decisionLine} from '../../shared/pick-decision';
import {comparisonRows} from '../../shared/pick-comparison';
import {buyingComparison,newcomerDecision} from '../../shared/pick-buying';
import {Text} from './design/Text';
import {hit,radius,space,useTheme} from './design/theme';
import {affiliateSeller,purchaseDestination,sellerPriceLabel,sortedPurchaseOptions} from '../../shared/purchases';
export function PickDecisionComparison({product,other,onAlternative,onLink}:{product:Product;other:Product;onAlternative:(product:Product)=>void;onLink:(url:string)=>void}){
 const {colors:C}=useTheme();const products=[product,other];
 const supplement=products.some(item=>item.category==='Supplements');
 const rows=supplement?buyingComparison(products):comparisonRows(products).filter(row=>!['Price basis','Colour','Color','Variant','Model'].includes(row.label)&&row.values.every(value=>value!=='Not recorded'&&value.length<=75)).slice(0,3);
 return <View style={{gap:space.md}}>
  <View style={{flexDirection:'row',gap:space.ms,alignItems:'stretch'}}>{products.map(item=>{const seller=sortedPurchaseOptions(item.purchaseOptions??[]).find(option=>option.availability!=='out-of-stock');return <View key={item.id} style={{flex:1,minWidth:0,borderRadius:radius.card,padding:space.ms,backgroundColor:C.card,gap:space.ms}}>
   <Pressable accessibilityRole="button" accessibilityLabel={`View ${item.title}`} onPress={()=>onAlternative(item)} style={{gap:space.ms,minHeight:hit}}><Image source={{uri:item.imageUrl}} resizeMode="contain" style={{height:110,width:'100%',backgroundColor:C.photoMat,borderRadius:radius.small}}/><Text variant="callout" style={{color:C.text,fontWeight:'600'}}>{item.title}</Text></Pressable>
   <Text variant="footnote" style={{color:C.muted}}>{decisionLine(item.assessment?.bestFor??item.summary,95)}</Text>
   {seller&&<Pressable accessibilityRole="link" accessibilityLabel={`${item.title}, ${seller.sellerName}, ${sellerPriceLabel(seller)}, opens seller`} onPress={()=>onLink(purchaseDestination(seller))} style={{minHeight:hit,gap:space.xs,justifyContent:'center'}}><Text variant="callout" style={{color:C.lime,fontWeight:'600'}}>{sellerPriceLabel(seller)} ↗</Text><Text numberOfLines={1} variant="caption" style={{color:C.muted}}>{seller.sellerName}</Text>{affiliateSeller(seller)&&<Text variant="caption" style={{color:C.muted}}>Affiliate link</Text>}</Pressable>}
  </View>;})}</View>
  {rows.map(row=><View key={row.label} style={{gap:space.sm,borderBottomWidth:1,borderColor:C.line,paddingBottom:space.ms}}><Text variant="caption" style={{color:C.lime}}>{row.label}</Text><View style={{flexDirection:'row',gap:space.ms}}>{row.values.map((value,index)=><Text key={index} variant="subhead" style={{flex:1,color:C.text}}>{value}</Text>)}</View></View>)}
  <Text variant="caption" style={{color:C.muted}}>{supplement?newcomerDecision(product):rows.length?'Listed specifications, not a hands-on verdict.':'Comparable specifications are not verified yet. No winner claimed.'}</Text>
  <Text variant="caption" style={{color:C.muted}}>Dated prices · confirm stock and checkout total.</Text>
 </View>;
}
