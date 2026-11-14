// The iframe is the byte-identical upstream demo; this file only owns its wrapper.
const panel=document.querySelector('#testPanel'),notice=document.querySelector('#webgpuNotice');
document.querySelector('#hideTestPanel').onclick=()=>{panel.open=false;panel.querySelector('summary').focus();};
async function checkSupport(){
 let adapter;try{adapter=await navigator.gpu?.requestAdapter();}catch{}
 if(adapter)return;
 notice.classList.add('unavailable');notice.textContent='WebGPU is unavailable in this browser or on this GPU. Try a compatible Chrome/Edge browser, or open the clearly labeled GUP adaptation comparison above. The original environment has not been replaced with a fallback.';panel.open=true;
}
checkSupport();
