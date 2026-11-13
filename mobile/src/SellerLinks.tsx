import {formatDate} from '../../shared/format';
import React from 'react';
import {Pressable,View} from 'react-native';
import {Text} from './design/Text';
import type {Product} from '../../shared/mobile';
import {affiliateSeller,purchaseDestination,purchaseHost,sellerPriceLabel,sortedPurchaseOptions,storeLabel,type PurchaseOption} from '../../shared/purchases';
import {Badge} from './design/components';
import {opacity,radius,size,space,useTheme} from './design/theme';

export function SellerLink({option,onLink}:{option:PurchaseOption;onLink:(url:string)=>void}){
  const {colors:C}=useTheme();const destination=purchaseDestination(option);const affiliate=affiliateSeller(option);const store=storeLabel(option.url);
  if(!purchaseHost(destination))return null;
  return <View style={{gap:space.sm}}>
    <Pressable accessibilityRole="link" accessibilityLabel={`${store}, ${sellerPriceLabel(option)}, opens external app or website`} accessibilityHint={affiliate?'Affiliate link. A commission may be earned.':'Opens the seller outside Qram.'} onPress={()=>onLink(destination)} style={({pressed})=>({minHeight:size.button,paddingHorizontal:space.md,paddingVertical:space.ms,borderRadius:radius.small,borderWidth:1,borderColor:C.line,flexDirection:'row',gap:space.ms,alignItems:'center',opacity:pressed?opacity.pressed:1})}>
      <Text variant="headline" style={{flex:1,minWidth:0,color:C.text}}>{store}</Text><Text variant="callout" style={{color:C.lime,fontWeight:'600',flexShrink:1}}>{sellerPriceLabel(option)} ↗</Text>
    </Pressable>
    {option.availability==='out-of-stock'&&<Badge>Unavailable at last check · view seller for updates</Badge>}
    {affiliate&&<Badge>Affiliate link · purchases may earn a commission</Badge>}
    {option.affiliateDisclosure&&<Badge>{option.affiliateDisclosure}</Badge>}
    <Badge>{store==='Amazon'?'Current price and availability on Amazon':`Listed price · checked ${formatDate(new Date(option.checkedAt))}. Final checkout may differ.`}</Badge>
  </View>;
}
export function SellerLinks({product,onLink}:{product:Product;onLink:(url:string)=>void}){
  if(product.demo)return <Badge>Demo only · no purchase link</Badge>;
  if(product.status!=='published')return <Badge>Seller links are available after review.</Badge>;
  const options=sortedPurchaseOptions((product.purchaseOptions??[]).filter(option=>purchaseHost(option.url)&&purchaseHost(purchaseDestination(option))));
  return <View style={{gap:space.ms}}>{options.map((option,index)=><SellerLink key={`${option.url}:${index}`} option={option} onLink={onLink}/>)}{options.length===0&&<Badge>Seller links haven’t been added yet.</Badge>}</View>;
}
