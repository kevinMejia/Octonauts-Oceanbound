const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();
  await page.goto(process.env.AUDIO_TEST_URL||'http://localhost:5173/?quality=low');
  await page.waitForSelector('#startup-play:not([hidden])',{timeout:180000});
  await page.click('#startup-play');await page.waitForSelector('#startup',{state:'detached'});
  const result=await page.evaluate(async()=>{
   const a=explorer.audio;await a.loading;
   const analyser=a.context.createAnalyser();analyser.fftSize=2048;a.master.connect(analyser);
   a.music?.setEnabled(false);for(const channel of Object.values(a.channels))channel.gain.gain.value=0;
   const readings=[];
   for(const [name,play] of [['open',()=>a.playWindow(true)],['close',()=>a.playWindow(false)],['lasso',()=>a.playRescue(true)],['rescue',()=>a.playRescue()],['animal',()=>a.playFound('animal')],['gup',()=>a.playFound('gup')]]){
    play();const samples=new Float32Array(analyser.fftSize);let peak=0;
    for(let i=0;i<18;i++){await new Promise(r=>setTimeout(r,50));analyser.getFloatTimeDomainData(samples);for(const v of samples)peak=Math.max(peak,Math.abs(v));}
    readings.push({name,peak});
   }
   a.master.disconnect(analyser);return {readings,errors:a.errors,state:a.context.state};
  });
  assert.deepEqual(result.errors,{});assert.equal(result.state,'running');for(const reading of result.readings)assert(reading.peak>.001,JSON.stringify(reading));
  await page.click('#menuToggle');assert(await page.evaluate(()=>!!explorer.audio.windowSound));
  console.log(JSON.stringify(result,null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
