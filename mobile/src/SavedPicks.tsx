import React from 'react';
import {Image,Pressable,View} from 'react-native';
import {Text} from './design/Text';
import {pickCategories,type MobilePayload,type Product} from '../../shared/mobile';
import {picksMap,savedPicks} from '../../shared/saved-picks';
import {useTheme} from './design/theme';
import {EmptyState} from './design/states';
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
  return <View style={{gap:26}}>
    {groups.map(group=><View key={group.id} accessibilityLabel={`${group.title} in your picks`} style={{gap:10}}>
      <View style={{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between'}}>
        <Text accessibilityRole="header" style={{color:C.text,fontSize:20,fontWeight:'700'}}>{group.title}</Text>
        <Text style={{color:C.muted,fontSize:14}}>{group.products.length}</Text>
      </View>
      {group.products.map((product,index)=><Pressable key={product.id} accessibilityRole="button" accessibilityLabel={`Open saved Pick ${product.title}`} onPress={()=>onPick(product)} style={({pressed})=>({flexDirection:'row',alignItems:'center',gap:12,paddingTop:index?10:0,borderTopWidth:index?0.5:0,borderColor:C.line,opacity:pressed?0.7:1})}>
        <View style={{width:48,height:48,borderRadius:6,overflow:'hidden',backgroundColor:C.photoMat}}>{product.imageUrl?<Image source={{uri:product.imageUrl}} accessibilityLabel={product.title} resizeMode="contain" style={{width:'100%',height:'100%'}}/>:null}</View>
        <View style={{flex:1,minWidth:0,gap:2}}>
          <Text numberOfLines={1} style={{color:C.text,fontSize:16,fontWeight:'600'}}>{product.title}</Text>
          {(product.variantLabel||product.status!=='published')&&<Text numberOfLines={1} style={{color:C.muted,fontSize:13}}>{product.status!=='published'?'No longer listed':product.variantLabel}</Text>}
        </View>
        <Text style={{color:C.muted,fontSize:20}}>›</Text>
      </Pressable>)}
    </View>)}
    {cards.length>0&&<View accessibilityLabel="Credit cards in your picks" style={{gap:10}}>
      <View style={{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between'}}>
        <Text accessibilityRole="header" style={{color:C.text,fontSize:20,fontWeight:'700'}}>Credit cards</Text>
        <Text style={{color:C.muted,fontSize:14}}>{cards.length}</Text>
      </View>
      {cards.map((card,index)=><Pressable key={card.id} accessibilityRole="button" accessibilityLabel={`Open ${card.name}`} onPress={()=>onCard(card)} style={({pressed})=>({flexDirection:'row',alignItems:'center',gap:12,paddingTop:index?10:0,borderTopWidth:index?0.5:0,borderColor:C.line,opacity:pressed?0.7:1})}>
        <View style={{width:48,height:32,borderRadius:5,overflow:'hidden',backgroundColor:C.photoMat}}>{card.imageUrl?<Image source={{uri:card.imageUrl}} accessibilityLabel={card.name} resizeMode="cover" style={{width:'100%',height:'100%'}}/>:null}</View>
        <View style={{flex:1,minWidth:0,gap:2}}>
          <Text numberOfLines={1} style={{color:C.text,fontSize:16,fontWeight:'600'}}>{card.name}</Text>
          <Text numberOfLines={1} style={{color:C.muted,fontSize:13}}>{card.issuer}</Text>
        </View>
        <Text style={{color:C.muted,fontSize:20}}>›</Text>
      </Pressable>)}
      {cheat.length>0&&<View style={{gap:8,marginTop:6}}>
        <Text accessibilityRole="header" style={{color:C.text,fontSize:16,fontWeight:'700'}}>Which card for what</Text>
        {cheat.map(row=><Pressable key={row.category} accessibilityRole="button" accessibilityLabel={`${row.category}, ${row.card.name}`} onPress={()=>onCard(row.card)} style={({pressed})=>({gap:2,opacity:pressed?0.7:1})}>
          <Text style={{color:C.text,fontSize:15}}>{row.category} → {row.card.name}</Text>
          <Text style={{color:C.muted,fontSize:13}}>{row.label}</Text>
        </Pressable>)}
      </View>}
      <Pressable accessibilityRole="button" accessibilityLabel="Add a card" onPress={onAddCard} style={({pressed})=>({minHeight:44,justifyContent:'center',opacity:pressed?0.7:1})}>
        <Text style={{color:C.lime,fontSize:15,fontWeight:'600'}}>+ Add a card</Text>
      </Pressable>
    </View>}
    {unavailable>0&&<Text style={{color:C.muted,fontSize:14,lineHeight:21}}>{unavailable} saved {unavailable===1?'Pick is':'Picks are'} currently unavailable.</Text>}
  </View>;
}
