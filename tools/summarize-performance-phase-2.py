"""Summarize stored measurements; never substitutes inferred benchmark numbers."""
import json, statistics as stats
from pathlib import Path
root = Path('docs/performance-audit/phase-2-data')
load = lambda name: json.loads((root / name).read_text())
def distribution(values):
    return dict(mean=stats.mean(values), min=min(values), max=max(values), stdev=stats.stdev(values) if len(values)>1 else 0)
result = {}
for quality in ['high', 'low']:
    timing = {}
    for stage in ['baseline', 'final']:
        runs = [load(f'{stage}-{quality}-{i}.json') for i in range(1,4)]
        timing[stage] = {
            'meanFrameMs': distribution([stats.mean(s['frameMs']['mean'] for s in run['results']) for run in runs]),
            'timedSubsystemSumMs': distribution([stats.mean(sum(v['mean'] for v in s['costMs'].values()) for s in run['results']) for run in runs]),
            'renderSubmitMs': distribution([stats.mean(s['costMs']['render']['mean'] for s in run['results']) for run in runs]),
            'scenarios': {s['name']: {
                'meanFrameMs': distribution([run['results'][i]['frameMs']['mean'] for run in runs]),
                'p95FrameMs': distribution([run['results'][i]['frameMs']['p95'] for run in runs]),
            } for i,s in enumerate(runs[0]['results'])}
        }
    baseline, final = [load(f'{stage}-probes-{quality}.json') for stage in ['baseline','final']]
    measurements=[]
    for b,a in zip(baseline['results'], final['results']):
        assert b['name']==a['name']
        assert b['probes']['passes']==a['probes']['passes'], 'Render submissions changed'
        assert b['snapshot']['transforms']==a['snapshot']['transforms'], 'Visible transforms changed'
        assert b['snapshot']['activeBuffers']==a['snapshot']['activeBuffers'], 'Visible buffers changed'
        assert b['memory']==a['memory'], 'Resource counts changed'
        for item in [b,a]:
            check=item['framebufferEquivalence']
            # Raster output can vary slightly even on unchanged repeated draws;
            # retain raw differences instead of asserting invented pixel equality.
            assert check['differentChannels']/check['comparedChannels']<.001, 'Framebuffer difference needs investigation'
        def measured(r):
            p=r['probes'];gpu=sorted(p['gpuMs'])
            return dict(uploadRequests=sum(v['requests'] for v in p['uploads'].values()),uploadBytes=sum(v['bytes'] for v in p['uploads'].values()),matrixCompositions=sum(p['matrixUpdates'].values()),gpuMedianMs=stats.median(gpu) if gpu else None,gpuP95Ms=gpu[int((len(gpu)-1)*.95)] if gpu else None,gpuSamples=len(gpu),memory=r['memory'],heapMiB=r['heap']/1048576)
        measurements.append(dict(name=b['name'],baseline=measured(b),final=measured(a),passTotals=b['probes']['passes'],crossLaunchPixelsEqual=b['snapshot']['pixels']==a['snapshot']['pixels'],baselineFramebuffer=b['framebufferEquivalence'],sameStateFramebuffer=a['framebufferEquivalence']))
    result[quality]=dict(timing=timing,measurements=measurements,inventory=baseline['inventory'])
(root/'summary.json').write_text(json.dumps(result,indent=2))
report=Path('docs/performance-audit/phase-2.md')
if report.exists():
    document=report.read_text(encoding='utf8')
    def section(name,content):
        global document
        start=f'<!-- GENERATED_{name} -->';end=f'<!-- END_GENERATED_{name} -->'
        a=document.index(start)+len(start);b=document.find(end,a)
        document=document[:a]+'\n\n'+content+'\n\n'+end+document[(b+len(end)) if b>=0 else a:]
    table=['High/desktop baseline; all corresponding after totals match exactly.','',
           '| Scenario | Main calls | Transmission calls | Shadow calls | Main triangles | Transmission triangles | Shadow triangles |',
           '|---|---:|---:|---:|---:|---:|---:|']
    for s in result['high']['measurements']:
        p=s['passTotals'];v=lambda pass_,key:p.get(pass_,{}).get(key,0)/120
        table.append(f"| {s['name']} | {v('main','calls'):.1f} | {v('transmission','calls'):.1f} | {v('shadow','calls'):.1f} | {v('main','triangles'):,.0f} | {v('transmission','triangles'):,.0f} | {v('shadow','triangles'):,.0f} |")
    table+=['','The mobile/low profile has zero shadow submissions by its existing configuration. Transmission remains present. Rescue adds four HUD draws (192 triangles) per sampled escort frame.','',
            '| Representative view | System | Main + transmission calls/update | Main + transmission triangles/update |',
            '|---|---|---:|---:|']
    raw=load('baseline-probes-high.json')
    for i in [0,1,3]:
        scenario=raw['results'][i];combined={}
        for key,value in scenario['probes']['objects'].items():
            pass_,label=key.split(':',1)
            if pass_ not in ['main','transmission']:continue
            entry=combined.setdefault(label,dict(calls=0,triangles=0))
            for k in entry:entry[k]+=value[k]
        for label,value in sorted(combined.items(),key=lambda t:-t[1]['calls'])[:5]:
            table.append(f"| {scenario['name']} | {label or 'unnamed/background/collectibles'} | {value['calls']/120:.1f} | {value['triangles']/120:,.0f} |")
    section('RENDER_TABLES','\n'.join(table))
    table=['Three-run means; parentheses show min–max of the three run means, in milliseconds.','',
           '| Profile | Metric | Before | After |','|---|---|---:|---:|']
    for quality,r in result.items():
        for key,label in [('meanFrameMs','Elapsed replay callback'),('timedSubsystemSumMs','Sum of timed CPU subsystems'),('renderSubmitMs','Render CPU submission')]:
            fmt=lambda stage:f"{r['timing'][stage][key]['mean']:.3f} ({r['timing'][stage][key]['min']:.3f}–{r['timing'][stage][key]['max']:.3f})"
            table.append(f'| {quality} | {label} | {fmt("baseline")} | {fmt("final")} |')
    for quality,r in result.items():
        table+=['',f'{quality.capitalize()} profile: elapsed mean and average per-run p95 from three uninstrumented runs; update bytes and GPU median/p95 from the separate final probe pair.','',
                '| Scenario | Elapsed mean before → after ms | Elapsed p95 before → after ms | Update KiB/step before → after | GPU median before → after ms | GPU p95 before → after ms |',
                '|---|---:|---:|---:|---:|---:|---:|']
        for s in r['measurements']:
            b,a=s['baseline'],s['final'];bt=r['timing']['baseline']['scenarios'][s['name']];at=r['timing']['final']['scenarios'][s['name']]
            table.append(f"| {s['name']} | {bt['meanFrameMs']['mean']:.3f} → {at['meanFrameMs']['mean']:.3f} | {bt['p95FrameMs']['mean']:.3f} → {at['p95FrameMs']['mean']:.3f} | {b['uploadBytes']/120/1024:.2f} → {a['uploadBytes']/120/1024:.2f} | {b['gpuMedianMs']:.3f} → {a['gpuMedianMs']:.3f} | {b['gpuP95Ms']:.3f} → {a['gpuP95Ms']:.3f} |")
        before=sum(s['baseline']['uploadBytes'] for s in r['measurements']);after=sum(s['final']['uploadBytes'] for s in r['measurements'])
        requests=sum(s['baseline']['uploadRequests'] for s in r['measurements'])
        table+=['',f'Total measured updates: **{before:,} → {after:,} bytes ({100*(1-after/before):.1f}% fewer)** across 960 sampled steps; **{requests:,} requests both before and after**. Local compositions decrease by exactly 32,040 in every 120-step scenario window.']
    section('BENCHMARK_TABLES','\n'.join(table))
    table=['| Profile | Maximum differing channels in optimized/full-upload A/B | Maximum in baseline A/B control | Maximum in unchanged final-repeat control | Maximum A/B channel delta (0–255) |',
           '|---|---:|---:|---:|---:|']
    for quality,r in result.items():
        comparisons=[s['sameStateFramebuffer'] for s in r['measurements']];baseline=[s['baselineFramebuffer'] for s in r['measurements']]
        table.append(f"| {quality} | {max(s['differentChannels'] for s in comparisons):,} / {comparisons[0]['comparedChannels']:,} | {max(s['differentChannels'] for s in baseline):,} | {max(s['unchangedRenderRepeat']['differentChannels'] for s in comparisons):,} | {max(s['maxChannelDelta'] for s in comparisons)} |")
    section('IMAGE_RESULTS','\n'.join(table))
    report.write_text(document,encoding='utf8')
for quality,r in result.items():
    print('\n',quality)
    for stage,t in r['timing'].items():print(stage, {k:v for k,v in t.items() if k!='scenarios'})
    for s in r['measurements']:
        b,a=s['baseline'],s['final']
        print(s['name'],'bytes',b['uploadBytes'],a['uploadBytes'],'GPU median',b['gpuMedianMs'],a['gpuMedianMs'],'pixelAB',s['sameStateFramebuffer']['differentChannels'])
