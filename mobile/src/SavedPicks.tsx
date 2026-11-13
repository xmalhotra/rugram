import React from 'react';
import {Image,Pressable,StyleSheet,View} from 'react-native';
import {Text} from './design/Text';
import {pickCategories,type MobilePayload,type Product} from '../../shared/mobile';
import {picksMap,savedPicks} from '../../shared/saved-picks';
import {hit,opacity,radius,space,useTheme} from './design/theme';
import {Button} from './design/components';
import {EmptyState} from './design/states';
import {Glyph} from './design/Glyph';
import {creditCards,type CreditCard} from '../../shared/credit-cards';
import {walletCheatSheet} from '../../shared/card-shelves';
/** Your picks map: only what you chose to save, grouped by category. A heading appears with its first save. */
export function SavedPicks({data,onPick,onCard,onBrowse,onAddCard}:{data:MobilePayload;onPick:(product:Product)=>void;onCard:(card:CreditCard)=>void;onBrowse:()=>void;onAddCard:()=>void}){
  const {colors:C}=useTheme();
  const categories=data.library?.settings.productCategories??pickCategories.map(id=>({id,title:id}));
  // The temporary product listings are gone, so only saved supplements show for now.
  const groups=picksMap(data,categories).filter(group=>group.id==='Supplements');const {unavailable}=savedPicks(data);
  // Your credit cards are the cards in My Cards.
  const cards=(data.library?.cards??creditCards).filter(card=>data.profile.cardWallet?.[card.id]);
  const cheat=walletCheatSheet(cards);
  if(!groups.length&&!cards.length&&!unavailable)return <EmptyState title="Nothing saved yet" description="Save the supplements you want to keep. They'll show up here." action={{label:'Browse supplements',onPress:onBrowse}}/>;
  return <View style={{gap:space.xl}}>
    {groups.map(group=><View key={group.id} accessibilityLabel={`${group.title} in your picks`} style={{gap:space.ms}}>
      <View style={{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between'}}>
        <Text accessibilityRole="header" variant="section" style={{color:C.text}}>{group.title}</Text>
        <Text variant="subhead" style={{color:C.muted}}>{group.products.length}</Text>
      </View>
      {group.products.map((product,index)=><Pressable key={product.id} accessibilityRole="button" accessibilityLabel={`Open saved Pick ${product.title}`} onPress={()=>onPick(product)} style={({pressed})=>({flexDirection:'row',alignItems:'center',gap:space.ms,paddingTop:index?space.ms:0,borderTopWidth:index?StyleSheet.hairlineWidth:0,borderColor:C.line,opacity:pressed?opacity.pressed:1})}>
        <View style={{width:48,height:48,borderRadius:radius.small,overflow:'hidden',backgroundColor:C.photoMat}}>{product.imageUrl?<Image source={{uri:product.imageUrl}} accessibilityLabel={product.title} resizeMode="contain" style={{width:'100%',height:'100%'}}/>:null}</View>
        <View style={{flex:1,minWidth:0,gap:space.xxs}}>
          <Text numberOfLines={1} variant="callout" style={{color:C.text,fontWeight:'600'}}>{product.title}</Text>
          {(product.variantLabel||product.status!=='published')&&<Text numberOfLines={1} variant="footnote" style={{color:C.muted}}>{product.status!=='published'?'No longer listed':product.variantLabel}</Text>}
        </View>
        <Glyph name={{ ios: 'chevron.right', android: 'chevron_right' }} fallback="›" color={C.muted} size={space.md} />
      </Pressable>)}
    </View>)}
    {cards.length>0&&<View accessibilityLabel="Credit cards in your picks" style={{gap:space.ms}}>
      <View style={{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between'}}>
        <Text accessibilityRole="header" variant="section" style={{color:C.text}}>Credit cards</Text>
        <Text variant="subhead" style={{color:C.muted}}>{cards.length}</Text>
      </View>
      {cards.map((card,index)=><Pressable key={card.id} accessibilityRole="button" accessibilityLabel={`Open ${card.name}`} onPress={()=>onCard(card)} style={({pressed})=>({flexDirection:'row',alignItems:'center',gap:space.ms,paddingTop:index?space.ms:0,borderTopWidth:index?StyleSheet.hairlineWidth:0,borderColor:C.line,opacity:pressed?opacity.pressed:1})}>
        <View style={{width:48,height:32,borderRadius:5,overflow:'hidden',backgroundColor:C.photoMat}}>{card.imageUrl?<Image source={{uri:card.imageUrl}} accessibilityLabel={card.name} resizeMode="cover" style={{width:'100%',height:'100%'}}/>:null}</View>
        <View style={{flex:1,minWidth:0,gap:space.xxs}}>
          <Text numberOfLines={1} variant="callout" style={{color:C.text,fontWeight:'600'}}>{card.name}</Text>
          <Text numberOfLines={1} variant="footnote" style={{color:C.muted}}>{card.issuer}</Text>
        </View>
        <Glyph name={{ ios: 'chevron.right', android: 'chevron_right' }} fallback="›" color={C.muted} size={space.md} />
      </Pressable>)}
      {cheat.length>0&&<View style={{gap:space.sm,marginTop:space.sm}}>
        <Text accessibilityRole="header" variant="callout" style={{color:C.text,fontWeight:'600'}}>Which card for what</Text>
        {cheat.map(row=><Pressable key={row.category} accessibilityRole="button" accessibilityLabel={`${row.category}, ${row.card.name}`} onPress={()=>onCard(row.card)} style={({pressed})=>({gap:space.xxs,opacity:pressed?opacity.pressed:1})}>
          <Text variant="subhead" style={{color:C.text}}>{row.category} → {row.card.name}</Text>
          <Text variant="footnote" style={{color:C.muted}}>{row.label}</Text>
        </Pressable>)}
      </View>}
      <Button variant="text" title="+ Add a card" accessibilityLabel="Add a card" onPress={onAddCard} />
    </View>}
    {unavailable>0&&<Text variant="subhead" style={{color:C.muted}}>{unavailable} saved {unavailable===1?'Pick is':'Picks are'} currently unavailable.</Text>}
  </View>;
}
