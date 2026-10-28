import {configureTurboWindow} from './turboWindowGeometry.js';
// Explicit fill avoids platform-native <meter> painting differences on Safari.
// Charge is owned by TurboBoost; the HUD only mirrors it in both directions.
export class TurboMeter{
 constructor(root){this.root=root;this.fill=root.querySelector('#turboFill');this.last=-1;configureTurboWindow(root);}
 update(charge){const value=Number.isFinite(charge)?Math.max(0,Math.min(100,charge)):0;if(value===this.last)return;this.last=value;this.fill.style.transform='scaleX('+(value/100)+')';this.root.setAttribute('aria-valuenow',String(value));}
}
