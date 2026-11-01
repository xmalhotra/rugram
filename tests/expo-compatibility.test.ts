import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';
const mobileRequire=createRequire(new URL('../mobile/package.json',import.meta.url));
test('iPhone Expo Go workflow matches the installed SDK 58 client',()=>{
  const manifest=mobileRequire('./package.json');
  const expo=mobileRequire('expo/package.json');
  assert.match(manifest.dependencies.expo,/^~58\.0\./);
  assert.match(expo.version,/^58\.0\./);
});
test('native dependency ranges match the installed Expo SDK compatibility map',()=>{
  const manifest=mobileRequire('./package.json');
  const bundled=mobileRequire('expo/bundledNativeModules.json');
  for(const [name,version]of Object.entries(manifest.dependencies)){
    if(bundled[name])assert.equal(version,bundled[name],`Align ${name} using expo install`);
  }
});
