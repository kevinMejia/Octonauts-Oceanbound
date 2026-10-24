// Touch devices cannot safely keep the whole fleet's full-size GPU textures.
// Source GLBs and Beautiful desktop uploads retain their original resolution.
export function vehicleTextureLimit({userAgent='',coarsePointer=false,performanceMode=false}={}){
 return performanceMode||coarsePointer||/iPhone|iPad|iPod/i.test(userAgent)?512:Infinity;
}
export function vehicleImageSize(width,height,limit=Infinity){
 const ratio=Math.min(1,limit/Math.max(width,height));
 return {width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio))};
}
