import React,{useState} from 'react';
import {View} from 'react-native';
import type {Product} from '../../shared/mobile';
import {electronicsBrowseCategories,electronicsItems} from '../../shared/electronics-discovery';
import {Text} from './design/Text';
import {space,useTheme} from './design/theme';
import {CategoryRail} from './CategoryRail';
import {BrowseShelf} from './BrowseShelf';
import {ProductPreview} from './ProductPreview';
export function ElectronicsBrowser({products,configured,onPick,onLink}:{products:Product[];configured:readonly string[];onPick:(product:Product)=>void;onLink:(url:string)=>void}){
 const {colors:C}=useTheme();const [selected,setSelected]=useState('All');
 const categories=electronicsBrowseCategories(products,configured);
 const active=selected==='All'||categories.includes(selected)?selected:'All';
 const items=electronicsItems(products,active);
 return <View style={{gap:space.md,backgroundColor:C.bg}}>
  <CategoryRail compact items={['All',...categories].map(category=>({id:category,title:category,illustration:'coding',imageUrl:category==='All'?undefined:electronicsItems(products,category)[0]?.imageUrl}))} selected={active} onSelect={setSelected} label="Electronics categories"/>
  <BrowseShelf label={active+' electronics'}>{items.map(product=><ProductPreview key={product.id} hero product={product} onPick={onPick} onLink={onLink}/>)}</BrowseShelf>
  {items.length===0&&<Text variant="subhead" style={{color:C.muted}}>No products in this category yet.</Text>}
  <Text variant="caption" style={{color:C.muted}}>Dated prices · confirm variant and stock with the seller.</Text>
 </View>;
}
