const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const stage=process.argv[2];if(!['baseline','final'].includes(stage))throw Error('Use baseline or final');
const root='docs/performance-audit/phase-2-data';fs.mkdirSync(root,{recursive:true});
const reference=stage==='baseline'?fs.readFileSync('docs/performance-audit/phase-2-baseline-revision.txt','utf8').trim():'';
for(const quality of ['high','low']){
 for(let repeat=1;repeat<=3;repeat++){
  const output=`${root}/${stage}-${quality}-${repeat}.json`;
  const result=spawnSync(process.execPath,['tools/performance-audit.cjs',output],{stdio:'inherit',env:{...process.env,AUDIT_QUALITY:quality,AUDIT_PROBES:'0',AUDIT_REFERENCE:reference}});
  if(result.status!==0)process.exit(result.status??1);
 }
 const result=spawnSync(process.execPath,['tools/performance-audit.cjs',`${root}/${stage}-probes-${quality}.json`],{stdio:'inherit',env:{...process.env,AUDIT_QUALITY:quality,AUDIT_PROBES:'1',AUDIT_REFERENCE:reference}});
 if(result.status!==0)process.exit(result.status??1);
}
