// These dynamic buffers rewrite every active slot each update. Replace any
// pending range (e.g. while culled) with the latest complete active prefix.
export function uploadActivePrefix(attribute,count){
 if(count===0)return;
 attribute.clearUpdateRanges();
 attribute.addUpdateRange(0,count*attribute.itemSize);
 attribute.needsUpdate=true;
}
