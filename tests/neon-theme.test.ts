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
    for(const surface of [C.bg,C.card])for(const foreground of [C.text,C.muted,C.lime,C.success,C.warning,C.info,C.danger])assert.ok(contrast(surface,foreground)>=4.5,`${surface} / ${foreground}`);
    for(const [background,foreground]of [[C.lime,C.onAccent],[C.success,C.onSuccess],[C.warning,C.onWarning],[C.info,C.onInfo],[C.danger,C.onDanger]])assert.ok(contrast(background,foreground)>=4.5);
  }
});
