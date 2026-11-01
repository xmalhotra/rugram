import {formatDate} from '../../shared/format';
import React,{useState} from 'react';
import {Pressable,View} from 'react-native';
import {Text} from './design/Text';
import type {CityEvent} from '../../shared/mobile';
import {discoverEvents,eventDirectories,eventProvider,eventTopics,eventWebsite,type EventTopic} from '../../shared/event-discovery';
import {Badge,Button,Card,Chip,Field,Heading} from './design/components';
import {useTheme} from './design/theme';
import {eventCost,eventDates} from '../../shared/flow-connections';
export function EventDiscovery({events,city,draftCity,onChangeCity,onSaveCity,busy,onOpen,onOpenSource}:{events:CityEvent[];city:string;draftCity:string;onChangeCity:(value:string)=>void;onSaveCity:()=>void;busy:boolean;onOpen:(event:CityEvent)=>void;onOpenSource:(source:typeof eventDirectories[number])=>void}){
  const [topic,setTopic]=useState<EventTopic|'All'>('All');const {colors:C}=useTheme();
  const matches=discoverEvents(events,city,topic);
  const copy={color:C.muted,fontSize:16,lineHeight:23} as const;
  const title={color:C.text,fontSize:21,fontWeight:'600',lineHeight:28} as const;
  return <View style={{gap:16}}>
    <Heading eyebrow="GET OUT. GET INVOLVED." title="Find your next challenge." copy="Tech communities, HYROX races, and marathons. Discover here; register on the event website."/>
    <Field label="Your city" value={draftCity} onChange={onChangeCity} placeholder="Bengaluru"/>
    <Button title="Set city" secondary disabled={busy || draftCity.trim().length<2} onPress={onSaveCity}/>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{(['All',...eventTopics] as const).map(value=><Chip key={value} title={value} active={topic===value} onPress={()=>setTopic(value)}/>)}</View>
    <Text accessibilityRole="header" style={title}>Curated in {city}</Text>
    {matches.length===0 && <Card><Text style={copy}>No curated {topic==='All'?'events':topic.toLowerCase()+' events'} in this city yet. Browse the sources below and choose your location there.</Text></Card>}
    {matches.map(event=><Pressable key={event.id} accessibilityRole="link" accessibilityLabel={`${event.title}. Opens ${eventProvider(event.registrationUrl!)} for registration.`} onPress={()=>onOpen(event)}>
      <Card><Badge>{event.topic} · {eventDates(event)}</Badge><Text style={title}>{event.title}</Text><Text style={copy}>{event.venue}{event.dateOnly?'':` · ${formatDate(new Date(event.startsAt), {hour:'numeric',minute:'2-digit'})}`}</Text><Text style={copy}>{event.description}</Text><Text style={copy}>{eventCost(event)}</Text>{event.registrationStatus && <Badge>{event.registrationStatus}</Badge>}<Badge>{eventWebsite(event.registrationUrl!)}</Badge><Text style={{color:C.lime,fontSize:16,fontWeight:'500'}}>{event.registrationStatus==='Tickets coming soon'?'View official announcement':`Open on ${eventProvider(event.registrationUrl!)}`} ↗</Text></Card>
    </Pressable>)}
    <Text accessibilityRole="header" style={title}>Browse trusted sources</Text>
    <Text style={copy}>These open external directories, not a live feed filtered to {city}. Choose your city and confirm dates, prices, and availability on the source site.</Text>
    {eventDirectories.filter(source=>topic==='All' || source.topic===topic).map(source=><Card key={source.id}><Badge>{source.topic}</Badge><Text style={title}>{source.name}</Text><Text style={copy}>{source.description}</Text><Button title="Browse events ↗" secondary onPress={()=>onOpenSource(source)}/></Card>)}
    <Text style={copy}>Registration, tickets, payments, and cancellations stay with the provider. Opening a link does not register you. Party and nightlife listings are not included.</Text>
  </View>;
}
