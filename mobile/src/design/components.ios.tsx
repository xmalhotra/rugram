import React from 'react';
import {Host,Button as SwiftButton} from '@expo/ui/swift-ui';
import {accessibilityLabel,buttonStyle,buttonBorderShape,controlSize,disabled as disable,fixedSize,foregroundStyle,frame,tint} from '@expo/ui/swift-ui/modifiers';
import {useTheme} from './theme';
import type {ButtonProps} from './components.shared';
export {Heading,Field,Card,Badge,Sheet,Choice,HabitToggle,DateTimeField,Chip} from './components.shared';
export * from './states';
export {BarChart,LineChart,Sparkline} from './Charts';
export {SegmentedControl} from './SegmentedControl.ios';
export function Button({title,onPress,secondary=false,disabled=false,destructive=false}:ButtonProps){const {colors:C,scheme}=useTheme();return <Host matchContents={{vertical:true}} colorScheme={scheme} seedColor={C.lime} style={{width:'100%',maxWidth:'100%',minWidth:0,minHeight: 48,marginVertical:4,flexShrink:1}}><SwiftButton label={title} onPress={onPress} role={destructive?'destructive':'default'} modifiers={[buttonStyle(secondary?'bordered':'borderedProminent'),controlSize('large'),buttonBorderShape('capsule'),tint(destructive?C.danger:secondary?C.lime:C.text),foregroundStyle(secondary?(destructive?C.danger:C.lime):C.bg),disable(disabled),fixedSize({horizontal:false,vertical:true}),frame({minHeight: 48}),accessibilityLabel(title)]}/></Host>;}
