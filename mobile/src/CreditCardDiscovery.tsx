import {formatInr} from '../../shared/format';
import React,{useState} from 'react';
import {ScrollView,View} from 'react-native';
import {Text} from './design/Text';
import type {CreditCard,CardWallet} from '../../shared/credit-cards';
import {cardAlternatives,cardTopics,editorialCardShortlist,newCreditCards,reviewedCard} from '../../shared/card-discovery';
import {Badge,Button,Card,Chip} from './design/components';
import {Disclosure} from './Disclosure';
import {useTheme} from './design/theme';
const fee=(value:number)=>value===0?'No annual fee':`${formatInr(value)} / year + tax`;
export function CreditCardDiscovery({cards,wallet,onOpen,onMyCards}:{cards:CreditCard[];wallet:CardWallet;onOpen:(card:CreditCard)=>void;onMyCards:()=>void}){
  const {colors:C}=useTheme();const topics=cardTopics(cards);const [selected,setSelected]=useState(topics[0]??'');const topic=topics.includes(selected)?selected:topics[0]??'';
  const shortlist=editorialCardShortlist(cards,topic);const latest=newCreditCards(cards);const radar=cards.filter(card=>reviewedCard(card)&&card.curation?.badge==='Worth watching'&&!latest.some(item=>item.id===card.id)).slice(0,2);
  const category=shortlist[0]?.card.benefits[0]?.category;
  const alternatives=category?cardAlternatives(cards,wallet,category):[];
  const copy={color:C.muted,fontSize:14,lineHeight:21} as const;
  function preview(card:CreditCard){return <Card key={card.id}><Badge>{card.issuer}</Badge><Text style={{color:C.text,fontSize:19,lineHeight:26,fontWeight:'600'}}>{card.name}</Text><Text style={copy}>{card.curation?.summary}</Text><Text style={{color:C.lime,fontSize:14}}>{fee(card.annualFee)}</Text><Button title="View card →" secondary onPress={()=>onOpen(card)}/></Card>;}
  return <View style={{gap:16}}>
    <Button title={`My Cards · ${Object.keys(wallet).length}`} secondary onPress={onMyCards}/>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>{topics.map(item=><Chip key={item} title={item} active={topic===item} onPress={()=>setSelected(item)}/>)}</ScrollView>
    <Text style={{color:C.text,fontSize:21,fontWeight:'600'}}>Everyday shortlist</Text>
    {shortlist.map(({card,rank,reason})=><Card key={card.id}><View style={{flexDirection:'row',gap:12,alignItems:'center'}}><Text style={{color:C.lime,fontSize:25,fontWeight:'600'}}>#{rank}</Text><View style={{flex:1,minWidth:0,gap:4}}><Text style={{color:C.muted,fontSize:13}}>{card.issuer} · {card.curation?.badge}</Text><Text style={{color:C.text,fontSize:19,lineHeight:26,fontWeight:'600'}}>{card.name}</Text></View></View><Text style={copy}>{card.curation?.summary}</Text><Text style={{color:C.lime,fontSize:14}}>{fee(card.annualFee)}</Text><Disclosure title="Why this pick?"><Text style={copy}>{reason}</Text><Text style={{...copy,fontSize:12}}>Editorial order within {topic}, considering fit, fees and restrictions—not a market-wide ranking or independent study. Source review: {card.checkedAt}.</Text></Disclosure><Button title="View card →" secondary onPress={()=>onOpen(card)}/></Card>)}
    {shortlist.length===0&&<Text style={copy}>No current shortlist here yet.</Text>}
    {Object.keys(wallet).length>0&&alternatives.length>0&&<Disclosure title="Worth a look for you">{alternatives.map(({candidate,baseline})=><Card key={candidate.card.id}><Text style={{color:C.text,fontSize:18,fontWeight:'600'}}>{candidate.card.name}</Text><Text style={copy}>Potentially stronger published cashback terms than your {baseline.card.name} for eligible {category?.toLowerCase()}.</Text><Text style={copy}>Rate {baseline.rate}% → {candidate.rate}% · cap ₹{baseline.cap} → ₹{candidate.cap} · annual fee ₹{baseline.fee} → ₹{candidate.fee}, before tax.</Text><Text style={{...copy,fontSize:12}}>Only for purchases eligible on both cards. Joining fees, lost benefits and merchant rules may change the outcome. No guaranteed saving.</Text><Button title="Review option →" secondary onPress={()=>onOpen(candidate.card)}/></Card>)}</Disclosure>}
    {latest.length>0&&<Disclosure title="New arrivals">{latest.map(preview)}</Disclosure>}
    {radar.length>0&&<Disclosure title="On the radar">{radar.map(preview)}</Disclosure>}
    <Text style={{...copy,fontSize:12}}>Useful for the right spending—not cards everyone must own. Pay in full; fees and interest can outweigh rewards.</Text>
  </View>;
}
