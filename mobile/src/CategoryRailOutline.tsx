import React from 'react';
import {View} from 'react-native';
import Svg,{Path} from 'react-native-svg';
import {categoryRailPath} from '../../shared/category-rail';
export function CategoryRailOutline({count,index,width,height,color,surface,inactiveSurface,itemWidth=88}:{count:number;index:number;width:number;height:number;color:string;surface:string;inactiveSurface:string;itemWidth?:number}){
 const shape=categoryRailPath(count,index,width,height,itemWidth);
 // One stroked path owns the baseline, side walls and all four curves.
 // A separate unstroked fill merges the active tab into the content surface.
 return <View pointerEvents="none" accessible={false} style={{position:'absolute',left:0,bottom:0,width:shape.width,height,backgroundColor:inactiveSurface}}>
  <Svg width={shape.width} height={height} viewBox={`0 0 ${shape.width} ${height}`}>
   {shape.fill&&<Path d={shape.fill} fill={surface}/>}
   <Path d={shape.border} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
 </View>;
}
