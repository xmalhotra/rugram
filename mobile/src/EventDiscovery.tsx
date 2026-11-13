import {formatDate} from '../../shared/format';
import React,{useState} from 'react';
import {Pressable,View} from 'react-native';
import {Text} from './design/Text';
import type {CityEvent} from '../../shared/mobile';
import {discoverEvents,eventDirectories,eventProvider,eventTopics,eventWebsite,type EventTopic} from '../../shared/event-discovery';
import {Badge,Button,Card,Chip,Field,Heading,SectionHeader} from './design/components';
import {space,useTheme} from './design/theme';
import {eventCost,eventDates} from '../../shared/flow-connections';
export function EventDiscovery({events,city,draftCity,onChangeCity,onSaveCity,busy,onOpen,onOpenSource}:{events:CityEvent[];city:string;draftCity:string;onChangeCity:(value:string)=>void;onSaveCity:()=>void;busy:boolean;onOpen:(event:CityEvent)=>void;onOpenSource:(source:typeof eventDirectories[number])=>void}){
  const [topic,setTopic]=useState<EventTopic|'All'>('All');const {colors:C}=useTheme();
  const matches=discoverEvents(events,city,topic);
  const copy={color:C.muted} as const;
  const title={color:C.text} as const;
  return <View style={{gap:space.md}}>
    <Heading eyebrow="GET OUT. GET INVOLVED." title="Find your next challenge." copy="Tech communities, HYROX races, and marathons. Discover here; register on the event website."/>
    <Field label="Your city" value={draftCity} onChange={onChangeCity} placeholder="Bengaluru"/>
    <Button title="Set city" secondary disabled={busy || draftCity.trim().length<2} onPress={onSaveCity}/>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:space.sm}}>{(['All',...eventTopics] as const).map(value=><Chip key={value} title={value} active={topic===value} onPress={()=>setTopic(value)}/>)}</View>
    <SectionHeader title={`Curated in ${city}`} />
    {matches.length===0 && <Card><Text variant="callout" style={copy}>No curated {topic==='All'?'events':topic.toLowerCase()+' events'} in this city yet. Browse the sources below and choose your location there.</Text></Card>}
    {matches.map(event=><Pressable key={event.id} accessibilityRole="link" accessibilityLabel={`${event.title}. Opens ${eventProvider(event.registrationUrl!)} for registration.`} onPress={()=>onOpen(event)}>
      <Card><Badge>{event.topic} · {eventDates(event)}</Badge><Text variant="section" style={title}>{event.title}</Text><Text variant="callout" style={copy}>{event.venue}{event.dateOnly?'':` · ${formatDate(new Date(event.startsAt), {hour:'numeric',minute:'2-digit'})}`}</Text><Text variant="callout" style={copy}>{event.description}</Text><Text variant="callout" style={copy}>{eventCost(event)}</Text>{event.registrationStatus && <Badge>{event.registrationStatus}</Badge>}<Badge>{eventWebsite(event.registrationUrl!)}</Badge><Text variant="callout" style={{color:C.lime}}>{event.registrationStatus==='Tickets coming soon'?'View official announcement':`Open on ${eventProvider(event.registrationUrl!)}`} ↗</Text></Card>
    </Pressable>)}
    <SectionHeader title="Browse trusted sources" />
    <Text variant="callout" style={copy}>These open external directories, not a live feed filtered to {city}. Choose your city and confirm dates, prices, and availability on the source site.</Text>
    {eventDirectories.filter(source=>topic==='All' || source.topic===topic).map(source=><Card key={source.id}><Badge>{source.topic}</Badge><Text variant="section" style={title}>{source.name}</Text><Text variant="callout" style={copy}>{source.description}</Text><Button title="Browse events ↗" secondary onPress={()=>onOpenSource(source)}/></Card>)}
    <Text variant="callout" style={copy}>Registration, tickets, payments, and cancellations stay with the provider. Opening a link does not register you. Party and nightlife listings are not included.</Text>
  </View>;
}
