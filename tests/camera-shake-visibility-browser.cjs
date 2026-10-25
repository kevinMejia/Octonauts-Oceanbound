const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();
  await page.route('**/shake-probe',route=>route.fulfill({contentType:'text/html',body:'<script type="importmap">{"imports":{"three":"/vendor/three.module.js"}}</script>'}));
  await page.goto('http://localhost:5173/shake-probe');
  const results=await page.evaluate(async()=>{
   const T=await import('/vendor/three.module.js'),{ChaseCamera}=await import('/src/camera/ChaseCamera.js'),{gameplaySettings}=await import('/src/ui/gameplayPreferences.js');
   const results=[];
   for(const [width,height] of [[390,844],[844,390],[1280,800]])for(const fps of [20,30,60])for(const orbit of [0,Math.PI/2,Math.PI]){
    const camera=new T.PerspectiveCamera(65,width/height,.1,650),chase=new ChaseCamera(camera,null);
    const sub={position:{x:0,y:12,z:0},heading:0,speed:0},input={orbit:{x:orbit,y:0,last:1e10},drag:false};
    gameplaySettings.cameraShake=true;gameplaySettings.shakeIntensity=1;chase.update(0,sub,input);
    const normal=new T.Vector3(0,0,1).applyQuaternion(camera.quaternion);
    const target=chase.target.clone();
    const project=()=>{camera.updateMatrixWorld();return target.clone().project(camera);};
    const base=project();chase.shake.impact({fresh:true,impact:12,nx:normal.x,ny:normal.y,nz:normal.z});
    let peak=0,frames=0,maxOffset=0;
    for(let i=0;i<Math.ceil(fps*.4);i++){
     chase.update(1/fps,sub,input);const point=project(),pixels=Math.hypot((point.x-base.x)*width/2,(point.y-base.y)*height/2);
     peak=Math.max(peak,pixels);if(pixels>.2)frames++;maxOffset=Math.max(maxOffset,camera.position.distanceTo(chase.basePosition));
    }
    if(peak<1||frames<2)throw Error('Invisible head-on shake '+JSON.stringify({width,height,fps,orbit,peak,frames}));
    if(maxOffset>.320001||camera.position.distanceTo(chase.basePosition)>1e-9)throw Error('Cap/drift regression');
    results.push({width,height,fps,orbit,peakPixels:peak,visibleFrames:frames});
   }
   return results;
  });
  assert.equal(results.length,27);console.log(JSON.stringify({cases:results.length,minPeakPixels:Math.min(...results.map(r=>r.peakPixels)),maxPeakPixels:Math.max(...results.map(r=>r.peakPixels))}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
