const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});
for(const width of [390,1280]){
 const p=await b.newPage({viewport:{width,height:width===390?844:720},hasTouch:width===390,isMobile:width===390}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:5173/');await p.waitForFunction(()=>window.explorer?.ready,null,{timeout:180000});await p.click('#startup-play');
 await p.click('#menuToggle');await p.click('#graphicsTab');await p.check('#showPerformance');await p.click('#closeSettings');await p.waitForFunction(()=>!document.querySelector('#settingsDialog').open);await p.waitForFunction(()=>document.querySelector('#performanceDisplay')?.textContent.includes('GPU textures'));
 await p.screenshot({path:'.local-assets/performance-display-'+width+'.png'});console.log(width,await p.locator('#performanceDisplay').textContent());
 await p.click('#menuToggle');await p.waitForFunction(()=>document.querySelector('#performanceDisplay').textContent.includes('paused'));await p.click('#graphicsTab');await p.uncheck('#showPerformance');if(await p.locator('#performanceDisplay').isVisible())throw Error('Not hidden');await p.check('#showPerformance');
 await p.reload();await p.waitForFunction(()=>window.explorer?.ready,null,{timeout:180000});if(!await p.locator('#showPerformance').isChecked())throw Error('Not persisted');await p.click('#startup-play');await p.waitForFunction(()=>document.querySelector('#performanceDisplay').textContent.includes('GPU textures'));if(errors.length)throw Error(errors.join('\n'));console.log('toggle, menu exclusion and reload passed',width);await p.close();
}await b.close();})().catch(e=>{console.error(e);process.exit(1)});
