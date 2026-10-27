import {installSettings} from './ui/Settings.js';
import {Game} from './game/Game.js';
import {StartupScreen} from './ui/StartupScreen.js';
let game;
const startup=new StartupScreen(()=>game);
installSettings();
game=new Game();window.explorer=game;
game.start({onProgress:value=>startup.progress(value)}).then(()=>startup.ready(()=>{
 // Browser-restricted operations begin in this click stack, before any wait.
 try{game.audio.beginGameplay();}catch(error){console.warn('Audio unavailable',error);}
 game.input.clear();game.releaseStartup();
})).catch(error=>{console.error(error);startup.fail();});
