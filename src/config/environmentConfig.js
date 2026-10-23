// Rendering-only profiles. Select ?quality=low or ?quality=high for comparison.
export const environmentConfig={
 terrainChunkSize:100,
 terrainSegments:48, // Shared edge samples produce continuous ~2m terrain detail.
 terrainDrawDistance:260,
 reefSpacing:55, // Metres between candidate reef pockets, with jitter and rejection.
 openingPocketAttempts:70,
 openSandDecorations:850,
 sandRippleScale:.8,
 profiles:{high:{pixelRatio:1.75,terrainSegments:48,drawDistance:260,reefFraction:1},low:{pixelRatio:1.25,terrainSegments:32,drawDistance:190,reefFraction:.7}},
};
export function renderingProfile(){const requested=new URLSearchParams(location.search).get('quality');return requested==='high'||requested==='low'?requested:matchMedia('(any-pointer:coarse)').matches?'low':'high';}
