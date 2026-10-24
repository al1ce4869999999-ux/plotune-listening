/* M4: phrase-aware antiphony and thematic imitation for the final audible score.
 * Pure opt-in transformation; no timers, renderer state or random globals. */
(function(root){'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rng(seed){let n=(seed>>>0)||1;return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296;};}
function chordPitch(target,chord,tonic,scale){
 if(!Number.isFinite(tonic)||!Array.isArray(scale)||scale.length!==7)return target;
 const degrees=[0,2,4].map(d=>(tonic+scale[(chord+d)%7])%12);
 let best=target,distance=Infinity;
 for(let midi=Math.max(46,Math.round(target)-3);midi<=Math.min(83,Math.round(target)+3);midi++){
  if(degrees.includes(((midi%12)+12)%12)&&Math.abs(midi-target)<distance){best=midi;distance=Math.abs(midi-target);}
 }
 return best;
}
function arrange({notes,harmony=[],duration,meter,step,seed=1,wholeTrackArc=[],tonic,scale,secondaryTone}={}){
 if(!Array.isArray(notes)||!Number.isFinite(duration)||duration<=0||!Number.isFinite(meter)||meter<=0||!Number.isFinite(step)||step<=0)
  throw new TypeError('M4 requires score notes and valid timing');
 const random=rng(seed^0x45acb31),bars=Math.floor(duration/meter+.0001);
 const lead=notes.filter(n=>n.voice==='lead'&&n.volume>0&&n.d>.04).sort((a,b)=>a.t-b.t);
 const original=notes.filter(n=>n.voice!=='counter').map(n=>({...n}));
 const responses=[];let previousResponse=-3;
 // Candidate response bars depend on the dramatic stage, seeded variation and spacing.
 // Do not insert a fixed reply every bar.
 for(let b=1;b<bars-1;b++){
  const stage=wholeTrackArc[b]?.stage||'development';
  const likelihood={opening:0,development:.55,climax:.8,resolution:.36}[stage]??.45;
  const choice=random();
  const onsetUnit=9+Math.floor(random()*4);
  const imitateChoice=random();
  // A sparse or short song must still contain a clearly audible reply.
  const essential=b===Math.floor(bars*.60)&&responses.length===0;
  if(b-previousResponse<2||(!essential&&choice>=likelihood))continue;
  const from=b*meter+onsetUnit*step;
  const until=Math.min(duration,(b+1)*meter-step*.12);
  if(until-from<step*2)continue;
  const source=lead.filter(n=>n.t<from-step*.3&&n.t>=from-2*meter).slice(-4);
  if(source.length<2)continue;
  const notesInAnswer=stage==='climax'?3:2;
  const mode=['echo','inversion','contraction'][Math.floor(imitateChoice*3)];
  const chord=harmony.find(x=>x.t<=from+1e-6&&x.t+meter>from)?.chord??0;
  const phrase=source.slice(-notesInAnswer);
  const first=phrase[0].midi,origin=clamp(Math.round(first-12),48,80);
  const length=(until-from)/notesInAnswer;
  const responseNotes=[];
  for(let i=0;i<notesInAnswer;i++){
   const interval=phrase[Math.min(i,phrase.length-1)].midi-first;
   const transformed=mode==='inversion'?-interval:mode==='contraction'?Math.round(interval*.55):interval;
   let pitch=clamp(origin+transformed,46,83);
   if(i===notesInAnswer-1)pitch=chordPitch(pitch,chord,tonic,scale);
   const t=from+i*length;
   responseNotes.push({t,d:Math.min(length*(i===notesInAnswer-1?.80:.72),duration-t),
    midi:pitch,voice:'counter',role:'counter',volume:stage==='climax'?.057:.045,
    ...(secondaryTone?{timbre:secondaryTone}:{})});
  }
  responses.push({bar:b,stage,mode,from,until,source:phrase.map(n=>n.midi),notes:responseNotes});
  previousResponse=b;
 }
 for(const reply of responses){
  // Reserve audible space for an answer, including sustained melody notes.
  for(let i=original.length-1;i>=0;i--){
   const n=original[i],overlaps=n.t<reply.until&&n.t+n.d>reply.from;
   if(!overlaps)continue;
   if(n.voice==='lead'){
    if(n.t>=reply.from){original.splice(i,1);}
    else {n.d=Math.min(n.d,reply.from-n.t-step*.08);if(n.d<=.04)original.splice(i,1);}
   }else if(['chords','pad','arp','sparkle'].includes(n.voice)){
    n.volume*=.62;
   }
  }
 }
 for(const reply of responses)original.push(...reply.notes);
 original.sort((a,b)=>a.t-b.t||a.midi-b.midi);
 return {notes:original,responses:responses.map(r=>({...r,notes:r.notes.map(n=>({...n}))})),responseCount:responses.length,
  imitationTypes:[...new Set(responses.map(r=>r.mode))]};
}
root.PlotuneM4Voices={arrange};
})(window);
