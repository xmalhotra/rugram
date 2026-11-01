import React,{useEffect} from 'react';
import {KeyboardAvoidingView,Platform,Pressable,ScrollView,View} from 'react-native';
import {Text} from './Text';
import {DetailSurface} from './DetailSurface';
import {Checkbox,Host,Picker,TextInput,useNativeState} from '@expo/ui';
import {accessibilityLabel} from '@expo/ui/swift-ui/modifiers';
import {semantics} from '@expo/ui/jetpack-compose/modifiers';
import {useTheme,type as typography,space,radius} from './theme';
import {NeonBackdrop} from './NeonBackdrop';
export type ButtonProps={title:string;onPress:()=>void;secondary?:boolean;disabled?:boolean;destructive?:boolean};
export function Chip({title,active,onPress,disabled=false}:{title:string;active:boolean;onPress:()=>void;disabled?:boolean}){const {colors:C}=useTheme();return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{selected:active,disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>({alignSelf:'flex-start',maxWidth:'100%',minHeight:48,justifyContent:'center',paddingHorizontal:16,paddingVertical:10,borderRadius:12,borderWidth:1,borderColor:active?C.lime:C.line,backgroundColor:active?C.lime:C.card,opacity:disabled?.45:pressed?0.7:1})}><Text style={{color:active?C.onAccent:C.text,fontSize:16,flexShrink:1}}>{title}</Text></Pressable>;}
export {DateTimeField} from './DateTimeField';
export function Heading({eyebrow,title,copy}:{eyebrow:string;title:string;copy?:string}){const {colors:C}=useTheme();return <View style={{gap:space.sm,marginBottom:space.md}}><Text style={{color:C.muted,fontSize:typography.footnote,fontWeight:'600'}}>{eyebrow}</Text><Text accessibilityRole="header" style={{color:C.text,fontSize:typography.largeTitle,lineHeight:41,fontWeight:'400',letterSpacing:-1.1}}>{title}</Text>{copy&&<Text style={{color:C.muted,fontSize:typography.body,lineHeight:25}}>{copy}</Text>}</View>;}
export function Field({label,value,onChange,placeholder,numeric=false,secure=false,multiline=false,maxLength,keyboardType='default',error}:{label:string;value:string;onChange:(value:string)=>void;placeholder?:string;numeric?:boolean;secure?:boolean;multiline?:boolean;maxLength?:number;keyboardType?:'default'|'url'|'email-address'|'number-pad'|'decimal-pad';error?:string}){
  const {colors:C,scheme}=useTheme();const state=useNativeState(value);useEffect(()=>{if(state.get()!==value)state.set(value);},[value,state]);
  return <View style={{gap:space.sm,marginVertical:space.sm}}><Text style={{color:C.muted,fontSize:typography.footnote}}>{label}</Text><Host colorScheme={scheme} seedColor={C.lime} matchContents={{vertical:true}} style={{width:'100%'}}><TextInput value={state} onChangeText={onChange} placeholder={placeholder??label} secureTextEntry={secure} multiline={!secure&&multiline} numberOfLines={!secure&&multiline?3:undefined} keyboardType={numeric?'decimal-pad':keyboardType} autoCapitalize="none" autoCorrect={false} autoComplete={secure?'current-password':'off'} maxLength={maxLength??(secure?256:200)} textStyle={{color:C.text}} modifiers={[Platform.OS==='ios'?accessibilityLabel(label):semantics({contentDescription:label})]} style={{padding:14,borderRadius:radius.control,backgroundColor:C.card,borderWidth:1,borderColor:C.line}} /></Host>{error&&<Text accessibilityRole="alert" style={{color:C.danger,fontSize:13}}>{error}</Text>}</View>;
}
export function Card({children}:{children:React.ReactNode}){const {colors:C}=useTheme();return <View style={{backgroundColor:C.card,borderRadius:radius.card,borderWidth:1,borderColor:C.line,padding:space.lg,gap:12,marginBottom:space.xs}}>{children}</View>;}
export function Badge({children}:{children:React.ReactNode}){const {colors:C}=useTheme();return <Text style={{color:C.muted,fontSize:typography.footnote,fontWeight:'500'}}>{children}</Text>;}
export function Choice<T extends string>({label,value,options,onChange}:{label:string;value:T;options:readonly T[];onChange:(value:T)=>void}){const {colors:C,scheme}=useTheme();return <View style={{gap:space.sm,marginVertical:space.sm}}><Text style={{color:C.muted,fontSize:typography.footnote}}>{label}</Text><Host matchContents={{vertical:true}} style={{width:'100%',minHeight: 48}} colorScheme={scheme} seedColor={C.lime}><Picker selectedValue={value} onValueChange={onChange} appearance="menu">{options.map(option=><Picker.Item key={option} value={option} label={option}/>)}</Picker></Host></View>;}
export function HabitToggle({title,detail,checked,disabled,onChange}:{title:string;detail:string;checked:boolean;disabled:boolean;onChange:(value:boolean)=>void}){const {colors:C,scheme}=useTheme();return <View style={{paddingVertical:space.md,borderTopWidth:.5,borderColor:C.line,gap:space.xs}}><Host matchContents={{vertical:true}} style={{width:'100%',minHeight: 48}} colorScheme={scheme} seedColor={C.lime}><Checkbox label={title} value={checked} disabled={disabled} onValueChange={onChange}/></Host><Text style={{color:C.muted,fontSize:typography.footnote,lineHeight:19}}>{detail}</Text></View>;}
export function Sheet({title,onClose,children,contentKey,scrollable=true,fullScreen=false,closeLabel='Done',navigation='close',headerAction,presentation}:{title:string;onClose:()=>void;children:React.ReactNode;contentKey?:string;scrollable?:boolean;fullScreen?:boolean;closeLabel?:string;navigation?:'back'|'close';headerAction?:React.ReactNode;presentation?:'inline'|'modal'}) {
  const {colors:C}=useTheme();
  return <DetailSurface onClose={onClose} fullScreen={fullScreen} presentation={presentation}>
        <NeonBackdrop/>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1,paddingHorizontal:space.lg}}>
          <View style={{flexDirection:'row',alignItems:'center',paddingVertical:12,gap:space.md}}>
            {navigation==='back' && <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onClose} hitSlop={4} style={{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center'}}><Text style={{color:C.lime,fontSize:30}}>←</Text></Pressable>}
            <Text accessibilityRole="header" style={{flex:1,minWidth:0,color:C.text,fontWeight:'600',fontSize:fullScreen?17:typography.title}} numberOfLines={2}>{title}</Text>
            {headerAction}
            {navigation==='close' && <Pressable accessibilityRole="button" accessibilityLabel="Close details" onPress={onClose} style={{minWidth:60,minHeight:48,alignItems:'center',justifyContent:'center',flexShrink:0}}><Text style={{color:C.lime,fontSize:17,fontWeight:'600'}}>{closeLabel}</Text></Pressable>}
          </View>
          {scrollable?<ScrollView key={contentKey} style={{flex:1}} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={{paddingBottom:space.xxl,gap:space.sm}}>{children}</ScrollView>:<View key={contentKey} style={{flex:1,minHeight:0}}>{children}</View>}
        </KeyboardAvoidingView>
  </DetailSurface>;
}
