const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{const root=path.resolve(__dirname,'..'),badge=fs.readFileSync(path.join(root,'assets/img/Octopus Badge Icon.png')).toString('base64'),browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({deviceScaleFactor:1});
 await page.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}body{display:grid;place-items:center;background:radial-gradient(ellipse at 50% -8%,#c0fff5 0,transparent 40%),linear-gradient(#28cfdd 0%,#0398b4 23%,#036b91 58%,#034c70 86%,#146d7c)}img{width:78%;height:auto;filter:drop-shadow(0 2.5vmin 3vmin #002e5266)}</style><img src="data:image/png;base64,${badge}" alt="Octonauts badge">`);
 await page.locator('img').evaluate(img=>img.decode());
 for(const size of [32,180,192,512]){await page.setViewportSize({width:size,height:size});await page.screenshot({path:path.join(root,`assets/icons/oceanbound-${size}.png`),omitBackground:false});}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
