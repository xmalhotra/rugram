import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import sharp from 'sharp';
const directory='mobile/assets/brand/';
test('brand assets have store-safe dimensions, alpha and Android safe-zone bounds',async()=>{
 const icon=await sharp(directory+'icon-ios.png').metadata();
 assert.equal(icon.width,1024);assert.equal(icon.height,1024);assert.equal(icon.hasAlpha,false);
 for(const file of ['adaptive-foreground.png','monochrome.png','splash-light.png','splash-dark.png']){
  const metadata=await sharp(directory+file).metadata();assert.equal(metadata.width,1024);assert.equal(metadata.height,1024);assert.equal(metadata.hasAlpha,true);
 }
 const {data,info}=await sharp(directory+'adaptive-foreground.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let minX=1024,minY=1024,maxX=0,maxY=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>0){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
 assert.ok(minX>=1024*.17&&minY>=1024*.17&&maxX<=1024*.83&&maxY<=1024*.83);
 const notification=await sharp(directory+'notification.png').metadata();assert.equal(notification.width,96);assert.equal(notification.hasAlpha,true);
});
test('native brand config uses the approved splash plugin and both appearances',()=>{
 const config=JSON.parse(readFileSync('mobile/app.json','utf8')).expo;
 assert.equal(config.icon,'./assets/brand/icon-ios.png');
 const plugin=config.plugins.find((entry:unknown)=>Array.isArray(entry)&&entry[0]==='expo-splash-screen');
 assert.ok(plugin);assert.equal(plugin[1].image,'./assets/brand/splash-light.png');assert.equal(plugin[1].dark.image,'./assets/brand/splash-dark.png');
 assert.equal(config.android.adaptiveIcon.monochromeImage,'./assets/brand/monochrome.png');
 assert.match(readFileSync('mobile/src/design/BrandMark.tsx','utf8'),/accessibilityLabel="Qram"/);
});
