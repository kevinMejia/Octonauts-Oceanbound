export const WORD_HUNT_KEY='oceanbound.word-hunt.v1';
export class WordHuntProgress{
 constructor(config,storage){this.config=config;this.storage=storage;this.ids=new Set();this.saved=true;
  try{const data=JSON.parse(storage?.getItem(WORD_HUNT_KEY)??'null');if(data?.version===1)for(const id of data.ids??[])if(config.letters.some(l=>l.id===id))this.ids.add(id);}catch{}
 }
 get count(){return this.ids.size;}
 get infiniteTurbo(){return this.count===this.config.letters.length;}
 save(){try{if(!this.storage)throw Error();this.storage.setItem(WORD_HUNT_KEY,JSON.stringify({version:1,ids:[...this.ids],count:this.count,infiniteTurbo:this.infiniteTurbo}));this.saved=true;}catch{this.saved=false;}}
 collect(id){if(this.ids.has(id)||!this.config.letters.some(l=>l.id===id))return false;this.ids.add(id);this.save();return true;}
 reset(){this.ids.clear();this.save();}
}
