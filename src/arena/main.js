import * as T from 'three';
import {AbyssalEnvironment} from './AbyssalEnvironment.js';
import {abyssalArenaConfig as config} from '../config/abyssalArenaConfig.js';
import {prepareVehicleTextures} from '../vehicles/VehicleTextures.js';
import {loadVehicle,releaseVehicleGPU} from '../vehicles/VehicleManager.js';
import {SubmarineController} from '../vehicles/SubmarineController.js';
import {Input} from '../input/Input.js';
import {ChaseCamera} from '../camera/ChaseCamera.js';
import {cameraConfig} from '../config/cameraConfig.js';
import {summarizeFrames} from '../ui/PerformanceDisplay.js';
const canvas=document.querySelector('canvas'),status=document.querySelector('#arenaLoading'),stats=document.querySelector('#arenaStats'),params=new URLSearchParams(location.search),quality=params.get('quality')==='high'?'high':params.get('quality')==='low'?'low':matchMedia('(any-pointer:coarse)').matches?'low':'high',profile=config.profiles[quality];
document.querySelector('#arenaQuality').value=quality;
document.querySelector('#arenaQuality').onchange=e=>{const u=new URL(location.href);u.searchParams.set('quality',e.target.value);location.assign(u);};
async function start(){
 const renderer=new T.WebGLRenderer({canvas,antialias:profile.antialias,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,profile.pixelRatio));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 const scene=new T.Scene();scene.background=new T.Color('#073e50');scene.fog=new T.FogExp2('#073e50',.014);scene.add(new T.HemisphereLight(0xb7f9dc,0x253843,2));const sun=new T.DirectionalLight(0xfff1b7,3);sun.position.set(-30,65,-20);scene.add(sun);
 const camera=new T.PerspectiveCamera(cameraConfig.fov,1,.1,400),env=new AbyssalEnvironment();await env.load(scene,quality);status.textContent='Loading GUP-B…';const gup=await loadVehicle('gup-b');await prepareVehicleTextures(gup,renderer);scene.add(gup.group);
 const input=new Input(canvas),sub=new SubmarineController();sub.selectVehicle('gup-b',gup.definition.movement,gup.definition);sub.collisionProxy=gup.definition.collision;sub.ground=()=>-11;sub.collisionWorld={resolve:s=>env.field.resolve(s)};sub.turbo.charge=100;
 const chase=new ChaseCamera(camera,{limit:(a,b)=>env.field.limit(a,b)},()=>-11);chase.profile=gup.definition.camera;
 const view=document.querySelector('#arenaView');for(const [i,p] of config.viewpoints.entries()){const option=document.createElement('option');option.value=i;option.textContent=p.name;view.append(option);}
 const reset=()=>{const pose=config.viewpoints[Number(view.value)];Object.assign(sub.position,pose);Object.assign(sub.previousPosition,sub.position);sub.heading=pose.heading;sub.speed=sub.vertical=sub.heave=sub.pitch=sub.bank=sub.steer=0;sub.surfaceActive=false;sub.surfaceVelocity=0;sub.collisionDrift.x=sub.collisionDrift.z=0;sub.turbo.charge=100;if(window.abyssalArena)window.abyssalArena.resetMetrics?.();input.clear();input.orbit.x=input.orbit.y=0;input.orbit.last=-100;chase.initial=true;gup.update(0,sub);chase.update(0,sub,input);};document.querySelector('#resetArena').onclick=reset;view.onchange=reset;reset();
 const resize=()=>{renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();chase.initial=true;};resize();addEventListener('resize',resize);canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();renderer.setAnimationLoop(null);status.hidden=false;status.textContent='Graphics interrupted. Reload this test area to try Low detail.';});
 let last=performance.now(),time=0,report=last,samples=[],paused=document.hidden;const resetMetrics=()=>{last=performance.now();report=last;samples=[];stats.textContent='Collecting foreground frame times…';};const visibility=()=>{paused=document.hidden;resetMetrics();input.clear();};document.addEventListener('visibilitychange',visibility);
 window.abyssalArena={renderer,scene,camera,sub,gup,input,chase,environment:env,quality,reset,resetMetrics,snapshot:()=>({quality,leaves:env.leafCount,position:{...sub.position},calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,resolution:[canvas.width,canvas.height]})};
 status.hidden=true;renderer.setAnimationLoop(now=>{const elapsed=Math.max(0,(now-last)/1000);last=now;if(paused)return;const accepted=Math.min(.15,elapsed),steps=Math.max(1,Math.ceil(accepted/(1/60))),controls=input.read();for(let i=0;i<steps;i++){sub.update(accepted/steps,controls);sub.position.x=Math.max(-config.bounds,Math.min(config.bounds,sub.position.x));sub.position.z=Math.max(-config.bounds,Math.min(config.bounds,sub.position.z));}time+=accepted;env.update(time);gup.update(accepted,sub);chase.update(accepted,sub,input);renderer.render(scene,camera);if(elapsed>0)samples.push(elapsed*1000);if(now-report>700){const m=summarizeFrames(samples);stats.textContent=m?`${m.fps.toFixed(0)} FPS · ${m.mean.toFixed(1)} ms · p95 ${m.p95.toFixed(1)} ms\n${renderer.info.render.calls} draws · ${renderer.info.render.triangles.toLocaleString()} triangles · ${canvas.width}×${canvas.height} · ${quality}\n${env.leafCount.toLocaleString()} kelp blades · GUP ${sub.position.x.toFixed(0)}, ${sub.position.y.toFixed(0)}, ${sub.position.z.toFixed(0)} m`:'Waiting for frames';samples=[];report=now;}});
 addEventListener('pagehide',()=>{renderer.setAnimationLoop(null);input.clear();env.dispose();releaseVehicleGPU(gup);renderer.dispose();},{once:true});
}
addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
start().catch(error=>{console.error(error);status.hidden=false;status.textContent='Test area could not load. Try Low detail or return to the ocean using the link above.';stats.textContent=error.message;});
