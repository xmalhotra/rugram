import React from 'react';
import {View} from 'react-native';
import Svg,{Line,Polyline,Rect,Text as SvgText} from 'react-native-svg';
import {Text} from './Text';
import {EmptyState} from './states';
import {useTheme} from './theme';
type Datum={label:string;value:number};
function Chart({data,label,line=false,compact=false}:{data:Datum[];label:string;line?:boolean;compact?:boolean}){
 const {colors:C}=useTheme();const values=data.filter(item=>Number.isFinite(item.value)&&item.value>=0).slice(-30);
 if(!values.length)return <EmptyState title="No data yet" description="Numbers appear after activity is recorded."/>;
 const width=320,height=compact?64:180,pad=compact?4:24;const max=Math.max(1,...values.map(item=>item.value));const step=(width-2*pad)/Math.max(1,values.length);const x=(index:number)=>pad+step*(index+.5);const y=(value:number)=>height-pad-(height-2*pad)*value/max;
 return <View accessible accessibilityLabel={`${label}. ${values.map(item=>`${item.label}: ${item.value}`).join('. ')}`} style={{gap:8}}>{!compact&&<Text accessibilityRole="header" style={{color:C.text,fontSize:17,fontWeight:'600'}}>{label}</Text>}<Svg accessible={false} width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
 {!compact&&<Line x1={pad} x2={width-pad} y1={height-pad} y2={height-pad} stroke={C.line}/>}
 {line?<Polyline points={values.map((item,index)=>`${x(index)},${y(item.value)}`).join(' ')} stroke={C.lime} strokeWidth={2} fill="none"/>:values.map((item,index)=><Rect key={index} x={x(index)-step*.3} y={y(item.value)} width={Math.max(1,step*.6)} height={Math.max(1,height-pad-y(item.value))} fill={C.lime} rx={2}/>)}
 {!compact&&values.filter((_,index)=>index%Math.max(1,Math.ceil(values.length/5))===0).map(item=>{const index=values.indexOf(item);return <SvgText key={index} x={x(index)} y={Math.max(12,y(item.value)-6)} fontSize={11} fill={C.text} textAnchor="middle">{item.value}</SvgText>;})}
 </Svg></View>;
}
export function BarChart(props:{data:Datum[];label:string}){return <Chart {...props}/>;}
export function LineChart(props:{data:Datum[];label:string}){return <Chart {...props} line/>;}
export function Sparkline(props:{data:Datum[];label:string}){return <Chart {...props} line compact/>;}
