/* Plotune v1.0: offline A/B comparisons for band and seven-part handheld music.
 * Deterministic, no network. Waveform difference measures signals, not quality
 * and never proves that a human listener can tell two arrangements apart.
 */
(function(root){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const NAMES={practice:'練習・試行',stumble:'失敗・つまずき',recovery:'立て直し',success:'成功',danger:'危険',
 loss:'喪失',turn:'展開の変化',anticipation:'期待',neutral:'変化なし'};
function durationOf(track){return Number(track?.score?.duration || track?.samples?.length/track?.sampleRate || 0);}
function windowAt(position,duration,radius=5){
 const length=clamp(radius*2,0.25,duration),center=clamp(position*duration,0,duration);
 // Keep a fixed length even if the event is close to the start or end.
 const start=clamp(center-radius,0,Math.max(0,duration-length));
 return {start,end:Math.min(duration,start+length),center};
}
function signalDifference(a,b,start,end){
 const rate=a.sampleRate||22050,from=Math.floor(start*rate),to=Math.min(a.samples.length,b.samples.length,Math.floor(end*rate));
 if(!b||b.sampleRate!==rate||to<=from)return {relative:0,rmsA:0,rmsB:0,absolute:0};
 let squareA=0,squareB=0,difference=0,count=0;
 for(let i=from;i<to;i+=13){
  const x=a.samples[i]||0,y=b.samples[i]||0;
  squareA+=x*x;squareB+=y*y;difference+=(x-y)*(x-y);count++;
 }
 const rmsA=Math.sqrt(squareA/Math.max(count,1)),rmsB=Math.sqrt(squareB/Math.max(count,1));
 const absolute=Math.sqrt(difference/Math.max(count,1));
 return {relative:clamp(absolute/Math.sqrt(rmsA*rmsA+rmsB*rmsB+1e-9),0,2),absolute,rmsA,rmsB};
}
function scoreRoles(track){
 const notes=track?.score?.notes||[];
 const percussion=track?.score?.percussion||track?.score?.drums||[];
 if(track?.score?.genre==='game'||track?.details?.genre==='game'){
  return {melody:notes.filter(x=>x.role==='lead'),
    counter:notes.filter(x=>x.role==='counter'),
    chords:notes.filter(x=>x.role==='chords'),
    arp:notes.filter(x=>x.role==='arp'),
    pad:notes.filter(x=>x.role==='pad'),
    sparkle:notes.filter(x=>x.role==='sparkle'),
    bass:notes.filter(x=>x.role==='bass'),drums:percussion};
 }
  if(['band','bandpiano'].includes(track?.score?.genre)||['band','bandpiano'].includes(track?.details?.genre)){
  return {guitar:notes.filter(x=>x.instrument==='guitar'),
    piano:notes.filter(x=>x.instrument==='piano'),bass:notes.filter(x=>x.instrument==='bass'),drums:percussion};
 }
 return {melody:notes.filter(x=>['lead','countermelody','riff'].includes(x.role)),
   chords:notes.filter(x=>['chord','ending','tension','impact','recovery','success','threat'].includes(x.role)),
   bass:notes.filter(x=>x.role==='bass'),drums:percussion};
}
function signature(item,drum){
 const t=Math.round(item.t*20); // 50 ms bins reduce microtiming noise
 const kind=drum?(item.kind||'drum'):(item.voice||item.instrument||'note')+':'+(item.role||'')+':'+(item.articulation||'');
 const pitch=drum?0:Math.round(item.midi||0);
 const volume=Math.round((Number(item.v??item.volume??0))*8);
 return [t,kind,pitch,volume].join(':');
}
function roleChanges(a,b,start,end){
 const aa=scoreRoles(a),bb=scoreRoles(b),names=Object.keys(aa),out={};
 for(const role of names){
  const drum=role==='drums';
  const select=source=>(source[role]||[]).filter(n=>n.t>=start&&n.t<end);
  const x=select(aa),y=select(bb),counts=new Map();
  for(const n of x){const key=signature(n,drum);counts.set(key,(counts.get(key)||0)+1);}
  let common=0;
  for(const n of y){const key=signature(n,drum),left=counts.get(key)||0;
   if(left){common++;counts.set(key,left-1);}
  }
  out[role]={base:x.length,resonare:y.length,changed:x.length+y.length-2*common};
 }
 return out;
}
function buildEvents(base,resonare,appraisal){
 if(!base||!resonare||!appraisal)return [];
 const duration=Math.min(durationOf(base),durationOf(resonare));
 if(!Number.isFinite(duration)||duration<=0)return [];
 const clues=appraisal.events.filter(e=>e.cue!=='neutral'&&Number.isFinite(e.position));
 return clues.slice(0,32).map((event,index)=>{
  const window=windowAt(event.position,duration,5);
  const audio=signalDifference(base,resonare,window.start,window.end);
  const roles=roleChanges(base,resonare,window.start,window.end);
  const scoreDelta=Object.values(roles).reduce((n,r)=>n+r.changed,0);
  const rests=(resonare.details?.rests||[]).filter(r=>r.start<window.end&&r.end>window.start)
   .reduce((n,r)=>n+Math.max(0,Math.min(r.end,window.end)-Math.max(r.start,window.start)),0);
  // Conservative diagnostic flag, not an acoustics or perception score.
  const insufficient=audio.relative<.12&&scoreDelta<4&&rests<.1;
  return {id:String(index),label:NAMES[event.cue]||event.cue,detail:String(event.text||'').slice(0,60),
   cue:event.cue,position:event.position,window,audio,roles,scoreDelta,rests,
   status:insufficient?'要改善（機械的な差が小さい）':'信号・楽譜に差あり（聴感未判定）'};
 }).sort((x,y)=>y.audio.relative-x.audio.relative||y.scoreDelta-x.scoreDelta);
}
function formatSeconds(n){return Math.round(n*10)/10+'秒';}
root.PlotuneCompare={windowAt,signalDifference,roleChanges,buildEvents,formatSeconds,NAMES};
})(window);
