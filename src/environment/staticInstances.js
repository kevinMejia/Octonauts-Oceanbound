// Records contain immutable placement matrices/tints. Culling may reorder slots,
// but an unchanged record in the same slot already has the correct GPU data.
export function writeStaticInstance(mesh,index,record,color){
 const slots=mesh.userData.staticSlots??=([]);
 if(slots[index]===record)return;
 slots[index]=record;mesh.setMatrixAt(index,record.matrix);
 if(color){color.setRGB(record.tint,record.tint,record.tint);mesh.setColorAt(index,color);}
 mesh.userData.staticFirst=Math.min(mesh.userData.staticFirst??index,index);
 mesh.userData.staticLast=Math.max(mesh.userData.staticLast??index,index);
}
export function finishStaticInstances(mesh,count){
 mesh.count=count;
 const {staticFirst:first,staticLast:last}=mesh.userData;
 if(first===undefined)return;
 mesh.instanceMatrix.addUpdateRange(first*16,(last-first+1)*16);
 mesh.instanceMatrix.needsUpdate=true;
 if(mesh.instanceColor){mesh.instanceColor.addUpdateRange(first*3,(last-first+1)*3);mesh.instanceColor.needsUpdate=true;}
 delete mesh.userData.staticFirst;delete mesh.userData.staticLast;
}
