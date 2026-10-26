// One world clock; color and light gains are linear multipliers on the existing day.
export const dayNightConfig={
 enabled:true,durationMinutes:5,durations:[5,10,20,30],mode:'automatic',automaticHeadlights:true,
 startTime:.45,dawnStart:.2,dawnEnd:.3,sunsetStart:.7,sunsetEnd:.8,overrideResponse:1.4,
 night:{sun:.2,ambient:.42,reflection:.48,caustics:.18,rays:.12,fogDensity:1.08,
  fog:'#063154',sky:'#102c51',sunColor:'#8bbdff',hemisphere:'#719fdb',ground:'#33495f',waterTint:[.2,.36,.6],skyTint:[.14,.23,.4]},
 twilight:{sunColor:'#ffbb80',warmth:.32},
 headlights:{color:0xffedca,intensity:100,distance:34,angle:.64,penumbra:.65,decay:2,downward:.25,nosePadding:.3,heightFraction:.12,response:2},
};
