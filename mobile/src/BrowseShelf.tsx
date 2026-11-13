import React from 'react';
import {FlatList,View} from 'react-native';
import {space} from './design/theme';
export function BrowseShelf({children,label}:{children:React.ReactNode;label:string}){
 const items=React.Children.toArray(children);
 return <FlatList data={items} horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={180} snapToAlignment="start" accessibilityLabel={label} initialNumToRender={4} maxToRenderPerBatch={4} windowSize={5} style={{flexGrow:0}} keyExtractor={(item,index)=>React.isValidElement(item)?String(item.key??index):String(index)} renderItem={({item})=><>{item}</>} ItemSeparatorComponent={()=><View style={{width:space.ms}}/>} getItemLayout={(_,index)=>({length:180,offset:180*index,index})} contentContainerStyle={{paddingVertical:space.xs,paddingRight:space.ms}}/>;
}
