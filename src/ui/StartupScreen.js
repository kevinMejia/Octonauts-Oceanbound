import {StartupTips} from './StartupTips.js';
import {startupTipState} from '../config/startupTipsConfig.js';
// One presentation for the existing Game.start promise. No parallel asset loader.
export class StartupScreen{
 constructor(getGame=()=>null){
  this.root=document.querySelector('#startup');this.ring=document.querySelector('#startup-progress');this.message=document.querySelector('#startup-message');this.play=document.querySelector('#startup-play');this.value=0;
  this.tips=new StartupTips(this.message,{state:()=>startupTipState(getGame()),reduced:()=>matchMedia('(prefers-reduced-motion:reduce)').matches});
  this.syncTips=()=>{const visible=this.root.isConnected&&!this.root.hidden&&!this.root.classList.contains('leaving')&&!this.root.classList.contains('has-error')&&!document.hidden&&getComputedStyle(this.root).display!=='none'&&getComputedStyle(this.root).visibility!=='hidden';if(visible)this.tips.start();else this.tips.stop();};
  this.tipObserver=new MutationObserver(this.syncTips);this.tipObserver.observe(this.root,{attributes:true,attributeFilter:['hidden','class','style']});
  // Make every gameplay surface inaccessible, including dynamically added HUDs.
  this.lock=node=>{if(node.nodeType===1&&node!==this.root){node.inert=true;}};
  [...document.body.children].forEach(this.lock);
  this.observer=new MutationObserver(records=>{records.forEach(record=>record.addedNodes.forEach(this.lock));this.syncTips();});
  this.observer.observe(document.body,{childList:true});
  const bubbles=document.querySelector('#startup-bubbles');
  for(let i=0;i<26;i++){const bubble=document.createElement('i');bubble.style.cssText=`--x:${(i*37)%100}%;--size:${5+i%5*5}px;--duration:${9+i%7}s;--delay:${-i*1.7}s;--drift:${i%2?35:-35}px`;bubbles.append(bubble);}
  const reef=document.querySelector('#startup-reef');
  // Reusable native SVG fronds and branching coral, kept along the edges.
  for(let i=0;i<30;i++){
   const plant=document.createElementNS('http://www.w3.org/2000/svg','svg');plant.setAttribute('viewBox','0 0 80 260');
   const coral=i%4===0;const x=i<15?i*1.8:76+(i-15)*1.8;
   plant.style.cssText=`left:${x}%;height:${coral?11+i%5*2:18+i%7*4}%;--lean:${i%2?8:-8}deg;--sway:${4+i%4}s;--delay:${-i*.6}s;color:${coral?['#ff9c45','#ba64c9','#f0bd51'][i%3]:['#168d70','#3baa65','#66b858','#087461'][i%4]}`;
   plant.innerHTML=coral?'<path d="M40 260V90M40 210Q9 197 10 155M40 173Q72 160 68 110M40 136Q20 125 20 95M40 110Q58 95 57 62" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>':'<path d="M39 260C18 205 62 161 36 108C20 67 36 26 50 5C77 58 40 80 55 127C79 185 41 208 48 260Z" fill="currentColor"/><path d="M43 260Q23 158 49 30" fill="none" stroke="#b3e28a" stroke-opacity=".28" stroke-width="2"/>';
   reef.append(plant);
  }
  this.visibility=()=>{this.root.classList.toggle('tab-hidden',document.hidden);this.syncTips();};document.addEventListener('visibilitychange',this.visibility);this.visibility();
 }
 progress(value){this.tips.refresh();this.value=Math.max(this.value,Math.min(1,value));this.ring.style.setProperty('--progress',this.value*100);this.ring.setAttribute('aria-valuenow',Math.round(this.value*100));}
 ready(onPlay){
  this.progress(1);
  // Allow the final real progress update to settle before revealing PLAY.
  this.timer=setTimeout(()=>{this.root.classList.add('is-ready');this.play.hidden=false;},650);
  this.play.addEventListener('click',()=>{
   if(this.entered)return;this.entered=true;this.tips.stop();this.tipObserver.disconnect();this.play.disabled=true;
   onPlay();this.observer.disconnect();[...document.body.children].forEach(node=>{node.inert=false;});document.body.classList.remove('starting');this.root.classList.add('leaving');this.root.inert=true;
   setTimeout(()=>{this.root.remove();document.removeEventListener('visibilitychange',this.visibility);},800);
  });
 }
 fail(){this.tips.stop();clearTimeout(this.timer);this.root.classList.add('has-error');this.ring.removeAttribute('role');this.message.textContent="We couldn't get the ocean ready. Let's try again!";const retry=document.querySelector('#startup-retry');retry.hidden=false;retry.onclick=()=>location.reload();}
}
