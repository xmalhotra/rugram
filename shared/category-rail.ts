export function categoryRailOutline(count:number,index:number,viewportWidth=0,itemWidth=88){
 const width=Math.max(viewportWidth,Math.max(0,count)*(itemWidth+8)+20);
 const valid=index>=0&&index<count;
 const start=14+index*(itemWidth+8);const end=start+itemWidth;const curve=14;
 return {width,valid,start,end,curve,leftWidth:valid?Math.max(0,start-curve):width,rightStart:valid?end+curve:width,rightWidth:valid?Math.max(0,width-end-curve):0};
}
export function categoryRailPath(count:number,index:number,width:number,height:number,itemWidth=88){
 const shape=categoryRailOutline(count,index,width,itemWidth);const top=0.75;const base=Math.max(2,height)-0.75;
 if(!shape.valid)return {width:shape.width,border:`M 0 ${base} H ${shape.width}`,fill:''};
 const r=Math.min(shape.curve,(base-top)/2);const crown=Math.min(18,(base-top)/2);
 const border=`M 0 ${base} H ${shape.start-r} Q ${shape.start} ${base} ${shape.start} ${base-r} V ${top+crown} Q ${shape.start} ${top} ${shape.start+crown} ${top} H ${shape.end-crown} Q ${shape.end} ${top} ${shape.end} ${top+crown} V ${base-r} Q ${shape.end} ${base} ${shape.end+r} ${base} H ${shape.width}`;
 return {width:shape.width,border,fill:`${border} L ${shape.width} ${height} L 0 ${height} Z`};
}
