import {test} from 'node:test';
import assert from 'node:assert/strict';
import {StartupTips} from '../src/ui/StartupTips.js';
import {startupTipsConfig,startupTipState} from '../src/config/startupTipsConfig.js';
function fixture(state=()=>startupTipState(),reduced=false){
 let time=0,id=0;const pending=new Map(),message={textContent:'',classList:{add(){},remove(){}}};
 const tips=new StartupTips(message,{state,reduced:()=>reduced,random:()=>.37,schedule:(fn,delay)=>{pending.set(++id,{fn,at:time+delay});return id;},cancel:id=>pending.delete(id)});
 const advance=ms=>{const end=time+ms;while(true){const entry=[...pending].sort((a,b)=>a[1].at-b[1].at)[0];if(!entry||entry[1].at>end)break;time=entry[1].at;pending.delete(entry[0]);entry[1].fn();assert(pending.size<=1);}time=end;};return {tips,message,pending,advance};
}
test('immediate shuffled queue exhausts eligible tips before repeating, including boundaries',()=>{
 const f=fixture();f.tips.start();const count=f.tips.eligible().length,seen=new Set([f.message.textContent]);
 for(let i=1;i<count;i++){f.advance(4000);assert(!seen.has(f.message.textContent));seen.add(f.message.textContent);}
 const last=f.message.textContent;f.advance(4000);assert.notEqual(f.message.textContent,last);
});
test('one timer rotates for minutes after readiness, stop cancels pending fade, restart is idempotent',()=>{
 for(const reduced of [false,true]){const f=fixture(undefined,reduced);f.tips.start();f.tips.start();assert.equal(f.pending.size,1);const initial=f.message.textContent;
 f.advance(3999);assert.equal(f.message.textContent,initial);f.advance(1);assert.notEqual(f.message.textContent,initial);
 f.advance(240000);assert.equal(f.pending.size,1);f.advance(3800);f.tips.stop();const last=f.message.textContent;f.advance(10000);assert.equal(f.pending.size,0);assert.equal(f.message.textContent,last);f.tips.start();assert.equal(f.pending.size,1);f.tips.stop();}
});
test('unknown progress uses general tips; loaded progress and completion update the queue',()=>{
 let state=startupTipState();const f=fixture(()=>state);f.tips.start();assert(f.tips.eligible().every(t=>!t.eligible));
 const fleet={registry:[{id:'b'},{id:'a'},{id:'x',finalReward:true}],isUnlocked:id=>id==='b'},marine={records:new Map([['a',{}],['b',{}]]),count:0},crew={config:{enabled:true},records:new Map([['a',{}]]),rescuedCount:0};
 state={fleet,marine,crew,hunt:{infiniteTurbo:false}};f.tips.refresh();assert.equal(f.tips.eligible().length,startupTipsConfig.tips.length);const creature=f.tips.eligible().find(t=>t.id==='creatures');assert.match(creature.text(state),/all 2 sea creatures/);
 f.tips.current='letters';fleet.isUnlocked=()=>true;marine.count=2;crew.rescuedCount=1;state.hunt.infiniteTurbo=true;f.tips.refresh();assert(!f.tips.eligible().some(t=>t.eligible));assert.notEqual(f.tips.current,'letters');for(let i=0;i<30;i++){f.advance(4000);assert(f.tips.eligible().some(t=>t.id===f.tips.current));}
});
test('GUP-X hint follows existing effective unlock state independently of other locked GUPs',()=>{
 const fleet={registry:[{id:'a'},{id:'x',finalReward:true}],isUnlocked:id=>id==='x'},f=fixture(()=>({fleet}));
 const ids=f.tips.eligible().map(t=>t.id);assert(ids.includes('fleet'));assert(!ids.includes('gup-x'));
});
