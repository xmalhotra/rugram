import {formatInr} from '../../shared/format';
import React from 'react';
import {Image,Pressable,View} from 'react-native';
import type {CreditCard,CardWallet} from '../../shared/credit-cards';
import {Text} from './design/Text';
import {Button} from './design/components';
import {useTheme} from './design/theme';
import {BrowseShelf} from './BrowseShelf';
export function CreditCardShowcase({cards,wallet,onOpen,onMyCards}:{cards:CreditCard[];wallet:CardWallet;onOpen:(card:CreditCard)=>void;onMyCards:()=>void}){
  const {colors:C}=useTheme();return <View style={{gap:14}}>
    <Button title={'My Cards · '+Object.keys(wallet).length} secondary onPress={onMyCards}/>
    <BrowseShelf label="Credit cards">{cards.map(card=><Pressable key={card.id} accessibilityRole="button" accessibilityLabel={'View '+card.name} onPress={()=>onOpen(card)} style={{width:168,padding:12,borderRadius:22,borderWidth:1,borderColor:C.line,backgroundColor:C.card,gap:12}}>
      {card.imageUrl?<Image source={{uri:card.imageUrl}} accessibilityLabel={card.name} resizeMode="contain" style={{width:'100%',height:112}}/>:<View style={{width:'100%',height:112,borderRadius:10,borderWidth:1,borderColor:C.line,justifyContent:'center',padding:10}}><Text style={{color:C.lime,fontSize:13}}>{card.issuer}</Text></View>}
      <Text numberOfLines={3} style={{color:C.text,fontSize:16,lineHeight:22,fontWeight:'600'}}>{card.name} →</Text>
      <Text style={{color:C.muted,fontSize:14}}>{card.annualFee===0?'No annual membership fee':formatInr(card.annualFee)+' / year + tax'}</Text>
    </Pressable>)}</BrowseShelf>
  </View>;
}
