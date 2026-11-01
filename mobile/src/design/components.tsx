import React from 'react';
import {Button as NativeButton,Host} from '@expo/ui';
import {useTheme} from './theme';
import type {ButtonProps} from './components.shared';
export {Heading,Field,Card,Badge,Sheet,Choice,HabitToggle,DateTimeField,Chip} from './components.shared';
export * from './states';
export {BarChart,LineChart,Sparkline} from './Charts';
export function Button({title,onPress,secondary=false,disabled=false,destructive=false}:ButtonProps){const {colors:C,scheme}=useTheme();return <Host matchContents={{vertical:true}} colorScheme={scheme} seedColor={destructive?C.danger:C.lime} style={{width:'100%',maxWidth:'100%',minWidth:0,minHeight:48,marginVertical:4,flexShrink:1}}><NativeButton label={title} onPress={onPress} disabled={disabled} variant={secondary?'outlined':'filled'} style={{paddingHorizontal:16,paddingVertical:12,borderRadius:12}}/></Host>;}
