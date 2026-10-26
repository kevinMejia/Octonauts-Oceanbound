const {chromium}=require('playwright'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'}),results=[];
for(const fallback of [false,true]){
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,...(fallback?{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 Version/16.6 Mobile/15E148 Safari/604.1'}:{})});
 await page.route('**/texture-pixel-probe?quality=low',r=>r.fulfill({contentType:'text/html',body:'<script type="importmap">{"imports":{"three":"/vendor/three.module.js"}}</script>'}));
 await page.goto('http://127.0.0.1:5173/texture-pixel-probe?quality=low');
 const rows=await page.evaluate(async()=>{
 const {vehicleLoader,vehicleImages}=await import('/src/vehicles/VehicleTextures.js'),loader=vehicleLoader();
 for(const id of ['a','b-high','c','d','e','f','q','r','x'])await loader.loadAsync('/assets/models/gup-'+id+'.glb');
 const canvas=document.createElement('canvas'),context=canvas.getContext('2d',{willReadFrequently:true}),rows=[];
 for(const entry of vehicleImages.entries.values())await vehicleImages.withImage(entry,()=>{
 canvas.width=entry.width;canvas.height=entry.height;context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(entry.source.data,0,0);
 const data=context.getImageData(0,0,canvas.width,canvas.height).data,min=[255,255,255,255],max=[0,0,0,0];
 for(let i=0;i<data.length;i++) {const channel=i%4;min[channel]=Math.min(min[channel],data[i]);max[channel]=Math.max(max[channel],data[i]);}
 rows.push({source:entry.key,width:entry.width,height:entry.height,uniform:min.every((v,i)=>v===max[i]),opaque:min[3]===255,min,max,hashPromise:crypto.subtle.digest('SHA-256',data).then(hash=>Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join(''))});
 });
 for(const row of rows){row.canvasPixelHash=await row.hashPromise;delete row.hashPromise;}return {rows,images:vehicleImages.snapshot()};
 });
 const groups=new Map();for(const row of rows.rows)if(row.opaque){const key=row.width+'x'+row.height+':'+row.canvasPixelHash;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row.source);}
 results.push({fallback,...rows,opaqueDuplicateGroups:[...groups.values()].filter(v=>v.length>1)});console.log(fallback?'HTML fallback':'ImageBitmap','uniform',rows.rows.filter(r=>r.uniform).length,'opaque duplicates',results.at(-1).opaqueDuplicateGroups.length);await page.close();
}
await browser.close();fs.writeFileSync('docs/performance-audit/vehicle-textures-data/mobile-pixels.json',JSON.stringify(results));})().catch(e=>{console.error(e);process.exit(1)});
