import React from 'react';
import {View} from 'react-native';
import {radius as corners, useTheme} from './design/theme';

// Small code-drawn scenes stay sharp offline and need no image downloads.
export function FocusIllustration({focusId,selected=false}:{focusId:string;selected?:boolean}){
  const {colors:C}=useTheme();
  const accent=selected?C.lime:C.illustrationAccent;
  function line(x1:number,y1:number,x2:number,y2:number,color=accent,weight=3){const length=Math.hypot(x2-x1,y2-y1);return <View style={{position:'absolute',left:(x1+x2)/2-length/2,top:(y1+y2)/2-weight/2,width:length,height:weight,borderRadius:weight,backgroundColor:color,transform:[{rotate:`${Math.atan2(y2-y1,x2-x1)}rad`}]}}/>;}
  function box(x:number,y:number,width:number,height:number,color=accent,radius=3){return <View style={{position:'absolute',left:x,top:y,width,height,borderRadius:radius,backgroundColor:color}}/>;}
  function dot(x:number,y:number,size:number,color=accent){return box(x-size/2,y-size/2,size,size,color,size/2);}
  const backdrop=C.illustrationBackdrop;
  let scene:React.ReactNode;
  switch(focusId){
    case 'morning-drinks': scene=<>{box(18,27,31,29,C.text,8)}{box(21,29,25,23,accent,5)}{dot(51,38,19,C.text)}{dot(51,38,12,backdrop)}{box(43,29,5,22,C.text,1)}{line(15,59,57,59,C.illustrationAccent,3)}{line(25,12,23,21,C.illustrationAccent,2)}{line(34,9,32,19,C.illustrationAccent,2)}{line(42,13,40,22,C.illustrationAccent,2)}</>;break;
    case 'ai': scene=<>{dot(36,36,26,C.text)}{dot(36,36,20,backdrop)}{dot(27,29,6)}{dot(45,29,6)}{dot(36,44,6)}{line(27,29,45,29)}{line(27,29,36,44)}{line(45,29,36,44)}{line(36,10,36,17,C.illustrationAccent)}{line(36,55,36,62,C.illustrationAccent)}{line(10,36,17,36,C.illustrationAccent)}{line(55,36,62,36,C.illustrationAccent)}</>;break;
    case 'cloud': scene=<>{dot(25,32,24)}{dot(39,26,29)}{dot(53,34,20)}{box(16,32,45,16)}{box(22,48,28,13,C.text,3)}{dot(27,54,3,accent)}{line(33,54,44,54,accent,2)}</>;break;
    case 'security': scene=<>{box(17,13,38,32,accent,8)}{dot(36,40,36,accent)}{box(23,20,26,23,backdrop,4)}{line(27,35,34,42,C.text)}{line(34,42,46,28,C.text)}</>;break;
    case 'community': scene=<>{dot(36,23,14)}{dot(15,29,10,C.illustrationAccent)}{dot(57,29,10,C.illustrationAccent)}{box(23,36,26,24,accent,10)}{box(6,40,13,18,C.illustrationAccent,6)}{box(53,40,13,18,C.illustrationAccent,6)}</>;break;
    case 'supplements': scene=<>{box(25,9,22,9,C.text,3)}{box(20,18,32,41,accent,8)}{box(23,30,26,18,backdrop,3)}{line(31,39,41,39,C.text,3)}{line(36,34,36,44,C.text,3)}{dot(57,21,4,C.illustrationAccent)}{dot(12,48,3,C.illustrationAccent)}</>;break;
    case 'cards': scene=<>{box(9,15,47,31,C.illustrationAccent,6)}{box(17,27,47,31,accent,6)}{box(17,34,47,6,C.text,0)}{box(23,46,9,5,backdrop,2)}{line(45,51,55,51,backdrop,2)}</>;break;
    case 'sleep': scene=<>{dot(49,19,15)}{dot(54,15,14,backdrop)}{dot(22,15,3,C.illustrationAccent)}{dot(35,10,2,C.illustrationAccent)}{box(12,38,48,14,C.text,4)}{box(16,33,14,8,accent,4)}{line(12,32,12,58,C.text)}{line(60,43,60,58,C.text)}{line(12,52,60,52,accent,2)}</>;break;
    case 'workout': scene=<>{line(18,49,54,23,C.text,5)}{line(12,39,26,58,accent,7)}{line(8,43,20,59,accent,4)}{line(46,14,60,33,accent,7)}{line(52,12,64,28,accent,4)}{dot(17,19,4,C.illustrationAccent)}</>;break;
    case 'running': scene=<>{dot(43,16,9,C.text)}{line(39,25,31,39)}{line(38,27,49,33)}{line(49,33,57,27)}{line(36,28,25,26)}{line(25,26,19,34)}{line(31,39,45,44)}{line(45,44,41,57)}{line(31,39,22,51)}{line(22,51,12,47)}{line(9,23,18,23,C.illustrationAccent,2)}{line(5,39,15,39,C.illustrationAccent,2)}{line(11,62,60,62,C.line,2)}</>;break;
    case 'hyrox': scene=<>{dot(21,20,8,C.text)}{line(24,28,33,38)}{line(28,31,43,30)}{line(33,38,21,44)}{line(21,44,14,56)}{line(33,38,38,54)}{line(43,29,43,54,C.text)}{line(43,54,61,54,C.text,4)}{box(48,43,10,9)}{line(9,60,63,60,C.line,2)}</>;break;
    case 'crossfit': scene=<>{dot(36,25,8,C.text)}{line(36,33,36,46)}{line(36,35,24,28)}{line(24,28,24,16)}{line(36,35,48,28)}{line(48,28,48,16)}{line(36,46,25,59)}{line(36,46,47,59)}{line(14,14,58,14,C.text)}{box(12,7,6,15)}{box(54,7,6,15)}{line(17,63,55,63,C.line,2)}</>;break;
    case 'reading': scene=<>{box(10,18,25,37,C.text,4)}{box(37,18,25,37,accent,4)}{line(36,17,36,58,C.illustrationAccent,3)}{line(16,28,29,28,backdrop,2)}{line(16,35,29,35,backdrop,2)}{line(16,42,27,42,backdrop,2)}{line(43,28,56,28,backdrop,2)}{line(43,35,56,35,backdrop,2)}{line(43,42,54,42,backdrop,2)}</>;break;
    case 'coding': scene=<>{box(12,16,48,34,C.text,5)}{box(15,19,42,28,backdrop,3)}{line(29,27,23,33)}{line(23,33,29,39)}{line(43,27,49,33)}{line(49,33,43,39)}{line(38,25,34,41,C.illustrationAccent,2)}{box(8,51,56,5,accent,3)}{box(29,50,14,3,C.text,1)}</>;break;
    case 'nutrition': scene=<>{box(14,39,44,13,accent,3)}{box(20,47,32,10,accent,8)}{box(29,55,14,3,C.text,2)}{dot(27,34,13,C.illustrationAccent)}{dot(40,33,14,accent)}{dot(48,37,10,C.illustrationAccent)}{line(33,23,38,16,C.text,2)}{box(38,12,13,7,accent,7)}{line(12,21,12,32,C.text,2)}{line(8,21,8,28,C.text,2)}{line(16,21,16,28,C.text,2)}{line(8,28,16,28,C.text,2)}</>;break;
    default: scene=<>{dot(36,35,35,C.illustrationAccent)}{dot(36,35,24,backdrop)}{dot(36,35,12,accent)}{line(36,35,54,17,C.text,2)}{line(46,17,54,17,C.text,2)}{line(54,17,54,25,C.text,2)}</>;
  }
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{width:72,height:72,flexShrink:0,borderRadius:corners.card,backgroundColor:backdrop,overflow:'hidden'}}>{scene}</View>;
}
