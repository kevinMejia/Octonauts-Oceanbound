import test from 'node:test';import assert from 'node:assert/strict';
import {gameplayDefaults,gameplayValues,loadGameplaySettings,saveGameplaySettings,compassSizeValue} from '../src/ui/gameplayPreferences.js';
import {crewMarkerLabel} from '../src/navigation/compassMarkers.js';
import {crewConfig} from '../src/config/crewConfig.js';
test('GUP and crew preferences default on, animals default off and validate each boolean independently',()=>{
 assert.deepEqual(loadGameplaySettings(),{cycleEnabled:true,cycleDuration:5,timeOfDay:'automatic',automaticHeadlights:true,cameraShake:true,shakeIntensity:.3,unlockGupX:false,showGupLetters:true,showOctonautLetters:true,showAnimalIcons:false,compassSize:100,gupDiveTilt:45});
 assert.deepEqual(gameplayValues({cameraShake:true,shakeIntensity:.3,unlockGupX:false,showGupLetters:false,showOctonautLetters:'false'}),{...gameplayDefaults,showGupLetters:false});
 assert.deepEqual(loadGameplaySettings({getItem:()=>'{broken'}),gameplayDefaults);
});
test('compass preferences round trip without touching discovery saves and tolerate denied storage',()=>{
 const data=new Map([['oceanbound.fleet.v1','fleet'],['oceanbound.crew-discoveries.v1','crew']]),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 const value={...gameplayDefaults,showGupLetters:false};assert(saveGameplaySettings(storage,value));assert.deepEqual(loadGameplaySettings(storage),value);assert.equal(data.get('oceanbound.fleet.v1'),'fleet');assert.equal(data.get('oceanbound.crew-discoveries.v1'),'crew');assert(!saveGameplaySettings({setItem(){throw Error();}},value));
});
test('crew compass labels use character initials and distinguish repeated initials',()=>{
 const roster=crewConfig.characters,labels=roster.map(d=>crewMarkerLabel(d,roster));assert.equal(new Set(labels).size,roster.length);assert.equal(crewMarkerLabel(roster.find(d=>d.id==='barnacles'),roster),'B');assert.equal(crewMarkerLabel(roster.find(d=>d.id==='inkling'),roster),'I');assert.equal(crewMarkerLabel(roster.find(d=>d.id==='tweak'),roster),'Tw');assert.equal(crewMarkerLabel(roster.find(d=>d.id==='tunip'),roster),'Tu');
});

test('compass size migrates older preferences and clamps invalid or oversized values',()=>{
 assert.equal(loadGameplaySettings({getItem:()=>'{"showGupLetters":false}'}).compassSize,100);
 for(const v of [undefined,null,'150',NaN,Infinity])assert.equal(compassSizeValue(v),100);
 assert.equal(compassSizeValue(0),75);assert.equal(compassSizeValue(500),150);assert.equal(compassSizeValue(127),125);
 const storage={value:null,setItem(k,v){this.value=v;},getItem(){return this.value;}};saveGameplaySettings(storage,{...gameplayDefaults,compassSize:140});assert.equal(loadGameplaySettings(storage).compassSize,140);
});

test('animal compass icons can be enabled and persist across reloads',()=>{const storage={value:null,setItem(k,v){this.value=v;},getItem(){return this.value;}};saveGameplaySettings(storage,{...gameplayDefaults,showAnimalIcons:true});assert.equal(loadGameplaySettings(storage).showAnimalIcons,true);assert.equal(gameplayValues({showAnimalIcons:'true'}).showAnimalIcons,false);});

test('dive tilt defaults to 45 degrees, validates saved values and persists',()=>{
 assert.equal(loadGameplaySettings().gupDiveTilt,45);
 for(const value of [null,'30',NaN,Infinity])assert.equal(gameplayValues({gupDiveTilt:value}).gupDiveTilt,45);
 assert.equal(gameplayValues({gupDiveTilt:-5}).gupDiveTilt,0);
 assert.equal(gameplayValues({gupDiveTilt:90}).gupDiveTilt,45);
 const storage={value:null,setItem(k,v){this.value=v;},getItem(){return this.value;}};
 saveGameplaySettings(storage,{...gameplayDefaults,gupDiveTilt:27});assert.equal(loadGameplaySettings(storage).gupDiveTilt,27);
});
