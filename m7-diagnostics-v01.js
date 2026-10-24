/* M7.4: descriptive, reproducible score/PCM diagnostics, not aesthetic quality scores. */
(function(root){'use strict';
const IDS=['baseline','phase','m','phase-m'];
const round=n=>Math.round(n*1000)/1000;
function inspect(track){
 const {score,samples,sampleRate}=track||{};
 if(!Array.isArray(score?.notes)||!samples?.length||!(sampleRate>0))throw new TypeError('score notes and PCM required');
 const notes=score.notes.filter(n=>Number.isFinite(n.midi)&&Number.isFinite(n.t)&&Number.isFinite(n.d)&&n.d>0);
 const lead=notes.filter(n=>n.voice==='lead').sort((a,b)=>a.t-b.t);
 const voices=[...new Set(notes.map(n=>n.voice))].sort();
 const pitches=new Set(lead.map(n=>n.midi));
 const intervals=lead.slice(1).map((n,i)=>Math.abs(n.midi-lead[i].midi));
 const meanInterval=intervals.length?intervals.reduce((a,b)=>a+b,0)/intervals.length:null;
 const harmony=Array.isArray(score.harmony)?score.harmony:[];
 let sum=0,peak=0,changes=0,previous=0;
 const block=Math.max(1,Math.floor(sampleRate/10));const envelope=[];
 for(let i=0;i<samples.length;i++){
  const x=samples[i];if(!Number.isFinite(x))throw new RangeError('invalid PCM');
  sum+=x*x;peak=Math.max(peak,Math.abs(x));
  if(i&&((x>=0)!==(previous>=0)))changes++;
  previous=x;
  if((i+1)%block===0||i===samples.length-1){let local=0;const start=Math.floor(i/block)*block;for(let j=start;j<=i;j++)local+=samples[j]*samples[j];envelope.push(Math.sqrt(local/(i-start+1)));}
 }
 const mean=envelope.reduce((a,b)=>a+b,0)/envelope.length;
 const variance=envelope.reduce((a,b)=>a+(b-mean)**2,0)/envelope.length;
 return {noteCount:notes.length,leadNotes:lead.length,leadPitchClasses:pitches.size,leadMeanInterval:meanInterval==null?null:round(meanInterval),
  harmonyEvents:harmony.length,voiceCount:voices.length,voices,drumEvents:score.drums?.length??null,
  rms:round(Math.sqrt(sum/samples.length)),peak:round(peak),dynamicVariation:round(Math.sqrt(variance)),
  zeroCrossingRate:round(changes/samples.length),duration:round(samples.length/sampleRate)};
}
function analyze(generation){
 if(generation?.tracks?.map(t=>t.conditionId).join('|')!==IDS.join('|'))throw new TypeError('four tracks required');
 return {schema:'plotune.m7.diagnostics.v1',seed:generation.request.seed,metrics:Object.fromEntries(generation.tracks.map(x=>[x.conditionId,inspect(x.track)]))};
}
function attach(doc){
 const panel=doc.getElementById('m7Diagnostics'),body=doc.getElementById('m7DiagnosticsBody');
 if(!panel||!body)return null;
 function show(generation){
  const result=analyze(generation);body.replaceChildren();
  const columns=[['noteCount','音符数'],['leadPitchClasses','主旋律の音高種類'],['leadMeanInterval','主旋律の平均音程差'],['harmonyEvents','和声イベント'],['voiceCount','声部種類'],['drumEvents','打楽器イベント'],['rms','音量RMS'],['dynamicVariation','音量変動'],['zeroCrossingRate','ゼロ交差率']];
  const table=doc.createElement('table'),head=doc.createElement('tr');
  for(const name of ['指標','Baseline','Phase','M','Phase+M']){const th=doc.createElement('th');th.textContent=name;head.append(th);}table.append(head);
  for(const [key,label] of columns){const tr=doc.createElement('tr'),th=doc.createElement('th');th.textContent=label;tr.append(th);
   for(const id of IDS){const td=doc.createElement('td');td.textContent=result.metrics[id][key]??'対象外';tr.append(td);}table.append(tr);}
  body.append(table);panel.hidden=false;return result;
 }
 return {show};
}
root.PlotuneM7Diagnostics={IDS,inspect,analyze,attach};
if(typeof document!=='undefined')root.PlotuneM7Diagnostics.controller=attach(document);
})(typeof window!=='undefined'?window:globalThis);
