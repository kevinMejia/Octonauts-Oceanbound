import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseGraphics,loadGraphicsMode,saveGraphicsMode,GRAPHICS_KEY} from '../src/ui/graphicsPreferences.js';
import {environmentConfig,graphicsSelection} from '../src/config/environmentConfig.js';
import {AdaptiveResolution} from '../src/environment/AdaptiveResolution.js';
import {vehicleTextureLimit} from '../src/vehicles/vehicleTexturePolicy.js';
const sample=(governor,frame,current,count)=>{for(let i=0;i<count;i++)current=governor.sample(frame,current);return current;};
test('Auto selects conservative mobile and low-memory presets, detailed desktop otherwise',()=>{
 assert.equal(chooseGraphics().quality,'high');assert.equal(chooseGraphics({coarsePointer:true}).quality,'low');assert.equal(chooseGraphics({userAgent:'iPhone CriOS'}).quality,'low');assert.equal(chooseGraphics({deviceMemory:4}).quality,'low');assert.equal(chooseGraphics({deviceMemory:8}).quality,'high');assert.equal(chooseGraphics().adaptive,true);
});
test('manual choices override hardware presets and QA links override the saved mode',()=>{
 assert.equal(chooseGraphics({mode:'beautiful',coarsePointer:true}).quality,'high');assert.equal(chooseGraphics({mode:'performance'}).quality,'low');assert.equal(chooseGraphics({mode:'beautiful'}).adaptive,false);
 const qa=chooseGraphics({mode:'performance',qualityOverride:'high'});assert.equal(qa.quality,'high');assert.equal(qa.override,true);assert.equal(qa.adaptive,false);
 assert.equal(chooseGraphics({mode:'bad',qualityOverride:'bad'}).mode,'auto');
});
test('graphics persistence safely handles invalid data without touching discoveries',()=>{
 const values=new Map([['oceanbound.marine-discoveries.v1','keep']]),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 assert.equal(loadGraphicsMode(storage),'auto');assert.equal(saveGraphicsMode(storage,'beautiful'),true);assert.equal(loadGraphicsMode(storage),'beautiful');assert.equal(values.get('oceanbound.marine-discoveries.v1'),'keep');assert.equal(saveGraphicsMode(storage,'bad'),false);
 for(const value of ['broken','null','{}','{"version":2,"mode":"beautiful"}']){values.set(GRAPHICS_KEY,value);assert.equal(loadGraphicsMode(storage),'auto');}
 assert.equal(saveGraphicsMode({setItem(){throw Error();}},'auto'),false);assert.equal(loadGraphicsMode({getItem(){throw Error();}}),'auto');
});
test('host selection handles blocked storage, touch and explicit overrides',()=>{
 const host={get localStorage(){throw Error();},location:{search:''},navigator:{userAgent:'iPhone'},matchMedia:()=>({matches:false})};assert.equal(graphicsSelection(host).quality,'low');host.location.search='?quality=high';assert.equal(graphicsSelection(host).quality,'high');
});
test('desktop and phone profiles change presentation budgets without changing world configuration',()=>{
 const {high,low}=environmentConfig.profiles;assert.ok(high.pixelRatio>low.pixelRatio&&high.drawDistance>low.drawDistance&&high.vegetationDistance>low.vegetationDistance);assert.equal(low.shadows,false);assert.equal(high.shadows,true);assert.equal(low.antialias,false);assert.ok(high.shadowMapSize>low.shadowMapSize);assert.ok(high.rayIntensity>low.rayIntensity);
 assert.equal(vehicleTextureLimit({performanceMode:true}),512);assert.equal(vehicleTextureLimit({userAgent:'iPhone',performanceMode:false}),512);assert.equal(vehicleTextureLimit({}),Infinity);
});
test('adaptive resolution waits for sustained load and respects a cooldown',()=>{
 const g=new AdaptiveResolution({min:.7,max:2,targetFrameMs:20});let ratio=1.5;ratio=sample(g,40,ratio,2);assert.equal(ratio,1.5);ratio=g.sample(40,ratio);assert.equal(ratio,1.35);ratio=sample(g,10,ratio,5);assert.equal(ratio,1.35);ratio=sample(g,16.7,ratio,6);assert.equal(ratio,1.45);
});
test('resolution is bounded and ignores sparse, invalid and manual samples',()=>{
 const g=new AdaptiveResolution({min:.7,max:1.336});assert.equal(sample(g,50,1,60),.7);g.reset();assert.equal(sample(g,10,1,100),1.336);
 for(const value of [0,NaN,Infinity,500])assert.equal(g.sample(value,1),1);assert.equal(g.sample(50,1,3),1);
 const manual=new AdaptiveResolution({enabled:false});assert.equal(sample(manual,50,1.5,30),1.5);g.reset();assert.equal(g.slow,0);assert.equal(g.cooldown,0);
});
