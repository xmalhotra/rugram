import test from 'node:test';
import assert from 'node:assert/strict';
import {palettes} from '../mobile/src/design/tokens';
import {resolveAppearance} from '../shared/appearance';
function luminance(hex:string){const rgb=hex.slice(1).match(/../g)!.map(value=>parseInt(value,16)/255).map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;}
function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);}
test('Neon-inspired dark palette keeps body copy, secondary copy and controls readable',()=>{
  const C=palettes.dark;
  for(const surface of [C.bg,C.card])for(const foreground of [C.text,C.muted,C.lime])assert.ok(contrast(surface,foreground)>=4.5,`${surface} / ${foreground}`);
  assert.ok(contrast(C.lime,C.onAccent)>=4.5);
  assert.equal(resolveAppearance('system','dark'),'dark');
});
test('system preference and semantic status colours work in both appearances',()=>{
  assert.equal(resolveAppearance('system','light'),'light');
  assert.equal(resolveAppearance('system',null),'light');
  assert.equal(resolveAppearance('dark','light'),'dark');
  assert.equal(resolveAppearance('light','dark'),'light');
  for(const C of Object.values(palettes)){
    for(const surface of [C.bg,C.card])for(const foreground of [C.text,C.muted,C.lime,C.missed,C.success,C.warning,C.info,C.danger])assert.ok(contrast(surface,foreground)>=4.5,`${surface} / ${foreground}`);
    for(const [background,foreground]of [[C.lime,C.onAccent],[C.success,C.onSuccess],[C.warning,C.onWarning],[C.info,C.onInfo],[C.danger,C.onDanger]])assert.ok(contrast(background,foreground)>=4.5);
  }
});
const simulate={
  deuteranopia:[[0.367322,0.860646,-0.227968],[0.280085,0.672501,0.047413],[-0.01182,0.04294,0.968881]],
  protanopia:[[0.152286,1.052583,-0.204868],[0.114503,0.786281,0.099216],[-0.003882,-0.048116,1.051998]],
};
function channels(hex:string){return hex.slice(1).match(/../g)!.map(value=>parseInt(value,16));}
function simulatedDistance(matrix:number[][],a:string,b:string){
  const paint=(hex:string)=>matrix.map(row=>{const [r,g,b]=channels(hex).map(value=>value/255);return Math.max(0,Math.min(1,row[0]*r+row[1]*g+row[2]*b));});
  const left=paint(a),right=paint(b);
  return Math.hypot(left[0]-right[0],left[1]-right[1],left[2]-right[2]);
}
test('missed stays blue and apart from the brand green for colour-blind members',()=>{
  for(const C of Object.values(palettes)){
    const [red,green,blue]=channels(C.missed);
    assert.ok(blue>red&&blue>green,C.missed);
    for(const matrix of Object.values(simulate))assert.ok(simulatedDistance(matrix,C.missed,C.lime)>=0.4,`${C.missed} / ${C.lime}`);
  }
});
