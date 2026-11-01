import React from 'react';
import {View} from 'react-native';
import {Text} from './design/Text';
import {emptyPurchaseDraft,readPurchaseDrafts,storeLabel,type PurchaseDraft} from '../../shared/purchases';
import {Badge,Button,Card,Field} from './design/components';
import {useTheme} from './design/theme';
export function PurchaseFields({form,onChange}:{form:Record<string,string>;onChange:(changes:Record<string,string>)=>void}){
  const {colors:C}=useTheme();const drafts=readPurchaseDrafts(form.purchaseOptions);
  function update(index:number,key:keyof PurchaseDraft,value:string){onChange({purchaseOptions:JSON.stringify(drafts.map((draft,i)=>i===index?{...draft,[key]:value}:draft))});}
  return <View style={{gap:14}}>
    <Text style={{color:C.text,fontSize:21,fontWeight:'600'}}>Where can someone buy it?</Text>
    <Field label="Exact variant / pack all links refer to" maxLength={160} value={form.variantLabel??''} onChange={variantLabel=>onChange({variantLabel})}/>
    <Badge>All links must match this product and variant. Enter the normal listed price; do not deduct a bank or coupon offer everyone may not qualify for.</Badge>
    {drafts.map((draft,index)=><Card key={index}><Badge>SELLER {index+1}{draft.url?` · ${storeLabel(draft.url)}`:''}</Badge>
      {([['url','Product link (HTTPS)'],['affiliateUrl','Approved affiliate link (optional)'],['sellerName','Sold by / seller name'],['price','Listed item price in INR'],['shippingFee','Known delivery charge (blank = unknown; 0 = free)'],['deliveryNote','Delivery / stock / location conditions'],['checkedDate','Price checked on (YYYY-MM-DD)'],['offerLabel','Optional offer description'],['offerTerms','Offer eligibility / minimum spend / conditions'],['offerCode','Optional coupon code'],['offerExpiry','Optional offer expiry (YYYY-MM-DD, end of UTC day)'],['affiliateDisclosure','Optional affiliate / commercial disclosure']] as [keyof PurchaseDraft,string][]).map(([key,label])=><Field key={key} label={key==='affiliateDisclosure'&&(draft.affiliateUrl||/[?&](tag|affid)=/.test(draft.url))?'Affiliate / commercial disclosure (required)':label} maxLength={key==='url'||key==='affiliateUrl'?2048:key==='offerTerms'?400:key==='deliveryNote'?300:key==='affiliateDisclosure'?200:key==='sellerName'||key==='offerCode'?80:key==='offerLabel'?100:40} keyboardType={key==='url'||key==='affiliateUrl'?'url':'default'} multiline={key==='offerTerms'||key==='deliveryNote'} error={key==='affiliateDisclosure'&&(draft.affiliateUrl||/[?&](tag|affid)=/.test(draft.url))&&draft.affiliateDisclosure.trim().length<3?'Explain the commercial relationship.':undefined} value={draft[key]??''} onChange={value=>update(index,key,value)} numeric={key==='price'||key==='shippingFee'}/>)}
      <Badge>Use the date you checked the page. This is a submitter-reported snapshot—not live pricing or independent verification. No offer? Leave all offer fields blank.</Badge>
      {drafts.length>1&&<Button title="Remove this seller" secondary onPress={()=>onChange({purchaseOptions:JSON.stringify(drafts.filter((_,i)=>i!==index))})}/>}
    </Card>)}
    {drafts.length<5&&<Button title="Add another seller link" secondary onPress={()=>onChange({purchaseOptions:JSON.stringify([...drafts,emptyPurchaseDraft()])})}/>}
  </View>;
}
