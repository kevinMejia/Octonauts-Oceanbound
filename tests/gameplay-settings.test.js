import test from 'node:test';import assert from 'node:assert/strict';
import {gameplayDefaults,gameplayValues,loadGameplaySettings,saveGameplaySettings} from '../src/ui/gameplayPreferences.js';
import {crewMarkerLabel} from '../src/navigation/compassMarkers.js';
import {crewConfig} from '../src/config/crewConfig.js';
test('compass preferences default on and validate each boolean independently',()=>{
 assert.deepEqual(loadGameplaySettings(),{showGupLetters:true,showOctonautLetters:true});
 assert.deepEqual(gameplayValues({showGupLetters:false,showOctonautLetters:'false'}),{showGupLetters:false,showOctonautLetters:true});
 assert.deepEqual(loadGameplaySettings({getItem:()=>'{broken'}),gameplayDefaults);
});
test('compass preferences round trip without touching discovery saves and tolerate denied storage',()=>{
 const data=new Map([['oceanbound.fleet.v1','fleet'],['oceanbound.crew-discoveries.v1','crew']]),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 const value={showGupLetters:false,showOctonautLetters:true};assert(saveGameplaySettings(storage,value));assert.deepEqual(loadGameplaySettings(storage),value);assert.equal(data.get('oceanbound.fleet.v1'),'fleet');assert.equal(data.get('oceanbound.crew-discoveries.v1'),'crew');assert(!saveGameplaySettings({setItem(){throw Error();}},value));
});
test('crew compass labels use character initials and distinguish repeated initials',()=>{
 const roster=crewConfig.characters,labels=roster.map(d=>crewMarkerLabel(d,roster));assert.equal(new Set(labels).size,roster.length);assert.equal(crewMarkerLabel(roster.find(d=>d.id==='barnacles'),roster),'B');assert.equal(crewMarkerLabel(roster.find(d=>d.id==='inkling'),roster),'I');assert.equal(crewMarkerLabel(roster.find(d=>d.id==='tweak'),roster),'Tw');assert.equal(crewMarkerLabel(roster.find(d=>d.id==='tunip'),roster),'Tu');
});
