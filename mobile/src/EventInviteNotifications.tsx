import {formatEventTime} from '../../shared/format';
import React,{useCallback,useRef,useState} from 'react';
import {Alert,AppState,Platform,Pressable,View} from 'react-native';
import {SymbolView} from 'expo-symbols';
import {useFocusEffect} from 'expo-router';
import type {EventInviteInbox} from '../../shared/event-invites';
import {api} from './api';
import {Button,Card,Sheet} from './design/components';
import {Text} from './design/Text';
import {useTheme} from './design/theme';

export function EventInviteNotifications(){
 const {colors:C}=useTheme();const [inbox,setInbox]=useState<EventInviteInbox>({requests:[],total:0});const [open,setOpen]=useState(false);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const known=useRef<Set<string>|null>(null);const active=useRef(false);const loading=useRef(false);
 const load=useCallback(async()=>{
  if(loading.current||!active.current||AppState.currentState!=='active')return;
  loading.current=true;
  try{const value=await api<EventInviteInbox>('/api/mobile/registrations?inbox=true');if(!active.current)return;const fresh=value.requests.find(item=>known.current&&!known.current.has(item.id));known.current=new Set(value.requests.map(item=>item.id));setInbox(value);setError('');if(fresh)Alert.alert('New invite request',`${fresh.guestName} requested an invite to ${fresh.eventTitle}.`,[{text:'Later',style:'cancel'},{text:'Review',onPress:()=>setOpen(true)}]);}
  catch(e){if(active.current)setError(e instanceof Error?e.message:'Could not load invite requests.');}finally{loading.current=false;}
 },[]);
 useFocusEffect(useCallback(()=>{active.current=true;void load();const timer=setInterval(()=>void load(),15000);const listener=AppState.addEventListener('change',state=>{if(state==='active')void load();});return()=>{active.current=false;clearInterval(timer);listener.remove();};},[load]));
 async function review(action:'approve'|'decline',eventId:string,guestId:string){if(busy)return;setBusy(true);try{await api('/api/mobile/registrations',{action,eventId,guestId});await load();}catch(e){setError(e instanceof Error?e.message:'Could not update request.');}finally{setBusy(false);}}
 return <><Pressable accessibilityRole="button" accessibilityLabel={`Invite requests${inbox.total?', '+inbox.total+' pending':''}`} onPress={()=>{setOpen(true);void load();}} style={({pressed})=>({width:44,height:44,flexShrink:0,borderRadius:22,alignItems:'center',justifyContent:'center',backgroundColor:C.card,opacity:pressed?0.7:1})}>
  {Platform.OS==='ios'?<SymbolView name="bell" tintColor={C.lime} style={{width:24,height:24}}/>:<Text style={{fontSize:22}}>🔔</Text>}
  {inbox.total>0&&<View pointerEvents="none" style={{position:'absolute',right:0,top:0,minWidth:17,height:17,paddingHorizontal:3,borderRadius:9,backgroundColor:C.lime,alignItems:'center',justifyContent:'center'}}><Text style={{color:C.onAccent,fontSize:10,fontWeight:'700'}}>{inbox.total>99?'99+':inbox.total}</Text></View>}
 </Pressable>{open&&<Sheet title="Invite requests" onClose={()=>setOpen(false)}><View style={{gap:14}}>
  {error&&<Text accessibilityRole="alert" style={{color:C.danger}}>{error}</Text>}
  <Button title="Refresh" secondary disabled={busy} onPress={()=>void load()}/>
  {!error&&inbox.total===0&&<Text style={{color:C.muted}}>No pending requests.</Text>}
  {inbox.requests.map(item=><Card key={item.id}><Text style={{color:C.text,fontSize:20,fontWeight:'600'}}>{item.guestName}</Text><Text style={{color:C.muted,fontSize:15}}>{item.eventTitle}</Text><Text style={{color:C.muted,fontSize:12}}>{formatEventTime(new Date(item.requestedAt))}</Text><Button title="Approve invite" disabled={busy} onPress={()=>void review('approve',item.eventId,item.guestId)}/><Button title="Decline" secondary disabled={busy} onPress={()=>Alert.alert('Decline invite?',item.guestName,[{text:'Keep request',style:'cancel'},{text:'Decline',style:'destructive',onPress:()=>void review('decline',item.eventId,item.guestId)}])}/></Card>)}
  {inbox.total>inbox.requests.length&&<Text style={{color:C.muted}}>Showing the latest 100. Review requests to see more.</Text>}
 </View></Sheet>}</>;
}
