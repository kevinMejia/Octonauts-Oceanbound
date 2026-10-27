// Independent of level geometry, water and vehicles. Colors use Three's Color inputs.
export const skyConfig={
 enabled:true,sun:true,moon:true,stars:true,clouds:true,brightness:1,
 cloudSpeed:.012,cloudCoverage:.5,sunRadius:.035,moonRadius:.028,
 dayZenith:'#238be1',dayHorizon:'#aadff5',nightZenith:'#07132f',nightHorizon:'#28476d',
 twilight:'#ffa76c',sunColor:'#fff0b0',moonColor:'#c9e5ff',
};
// Ocean adapter only: prepare before the local wave/transition band, release deeper.
export const oceanSkyConfig={prepareDepth:5,releaseDepth:7};
