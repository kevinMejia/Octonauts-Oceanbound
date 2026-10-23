// User preferences are independent of the gameplay envelopes in AudioManager.
export const AUDIO_KEY='oceanbound.audio.v1';
export const audioDefaults=Object.freeze({master:.8,music:.35,propeller:.65,bubbles:.5,ambience:.4,turbo:.65,muted:false,musicEnabled:true});
export const volumeKeys=['master','music','propeller','bubbles','ambience','turbo'];
export function loadAudioSettings(storage){
 const result={...audioDefaults};
 try{
  const raw=storage?.getItem(AUDIO_KEY);
  if(raw!==null&&raw!==undefined){const saved=JSON.parse(raw);if(saved&&typeof saved==='object'){
   for(const key of volumeKeys)if(typeof saved[key]==='number'&&Number.isFinite(saved[key]))result[key]=Math.max(0,Math.min(1,saved[key]));
   for(const key of ['muted','musicEnabled'])if(typeof saved[key]==='boolean')result[key]=saved[key];
  }}else{const legacy=storage?.getItem('oceanbound.masterVolume');if(legacy!==null&&legacy!==undefined&&legacy.trim()!==''&&Number.isFinite(Number(legacy)))result.master=Math.max(0,Math.min(1,Number(legacy)));}
 }catch{}
 return result;
}
export function saveAudioSettings(storage,settings){try{storage?.setItem(AUDIO_KEY,JSON.stringify(settings));return !!storage;}catch{return false;}}
