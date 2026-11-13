import React,{useState} from 'react';
import {Pressable,View} from 'react-native';
import {Text} from './design/Text';
import {Card,Field,Sheet} from './design/components';
import {radius,space,stroke,useTheme} from './design/theme';
export function EventLocationPicker({cities,selected,country,onSelect,onClose}:{cities:string[];selected:string|null;country:string;onSelect:(city:string)=>void;onClose:()=>void}){
  const {colors:C}=useTheme();const [search,setSearch]=useState('');const matches=cities.filter(city=>city.toLowerCase().includes(search.trim().toLowerCase()));
  return <Sheet title="Choose a city" onClose={onClose}>
    {cities.length>5&&<Field label="Search cities" value={search} onChange={setSearch}/>}
    {matches.map(city=><Pressable key={city} accessibilityRole="radio" accessibilityState={{checked:city===selected}} accessibilityLabel={`${city}, ${country==='IN'?'India':country}`} onPress={()=>onSelect(city)}><Card><View style={{flexDirection:'row',gap:space.ms,alignItems:'center'}}><View style={{flex:1,gap:space.xs}}><Text variant="section" style={{color:C.text}}>{city}</Text><Text variant="subhead" style={{color:C.muted}}>{country==='IN'?'India':country}</Text></View><View style={{height:22,width:22,borderRadius:radius.pill,borderWidth:stroke.active,borderColor:city===selected?C.lime:C.line,alignItems:'center',justifyContent:'center'}}>{city===selected&&<View style={{width:10,height:10,borderRadius:5,backgroundColor:C.lime}}/>}</View></View></Card></Pressable>)}
    {matches.length===0&&<Text variant="subhead" style={{color:C.muted}}>No supported city matches your search.</Text>}
    <Text variant="footnote" style={{color:C.muted}}>{cities.length===1?`We’re starting with curated events in ${cities[0]}. More cities will appear here when available.`:'Only cities enabled for our curated event coverage are listed here.'}</Text>
  </Sheet>;
}
