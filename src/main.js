import {installSettings} from './ui/Settings.js';
import {Game} from './game/Game.js';
installSettings();
const game=new Game();window.explorer=game;
game.start().catch(error=>{console.error(error);document.querySelector('#status').textContent='Unable to start the dive: '+error.message;});
