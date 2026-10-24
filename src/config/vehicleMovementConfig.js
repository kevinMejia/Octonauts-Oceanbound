// World metres/second; acceleration is the existing exponential response (1/s).
const baseline=12;
const tuning={ 'gup-e':['slow',.65,1.7], 'gup-a':['slow',.72,1.8], 'gup-c':['slow',.79,1.9], 'gup-d':['medium',.88,2], 'gup-f':['medium',.97,2.1], 'gup-b':['medium',1.06,2.2], 'gup-q':['fast',1.25,2.3], 'gup-r':['fast',1.4,2.4] };
export function vehicleMovement(id,existing={}){
 const t=tuning[id];if(!t)return existing;
 const [tier,speedMultiplier,acceleration]=t,maxSpeed=baseline*speedMultiplier;
 return {...existing,tier,speedMultiplier,cruisingSpeed:maxSpeed*.8,maxSpeed,acceleration};
}
