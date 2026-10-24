/* Plotune v0.4: structural, event-aligned procedural score.
   The baseline and Resonare A/B use this *same* renderer and instrument palette.
   Resonare affects score structure (timed rests, harmony, contour, orchestration).
   Deterministic, offline; no audio samples, APIs, dependencies or network.
*/
(function(root){
'use strict';
const RATE=22050, PI2=Math.PI*2;
const SCALES={major:[0,2,4,5,7,9,11],minor:[0,2,3,5,7,8,10]};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
function random(seed){let s=(seed>>>0)||1;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296}};
function degree(root,scale,index){
 const octave=Math.floor(index/7),i=((index%7)+7)%7;
 return root+scale[i]+12*octave;
}
function buildScore(plan){
 if(!plan||!Number.isFinite(plan.bpm)||plan.bpm<40||plan.bpm>200)throw Error('Invalid tempo');
 const duration=clamp(Number(plan.duration)||30,1,120),eighth=30/plan.bpm;
 const scale=SCALES[plan.mode]||SCALES.major,steps=Math.ceil(duration/eighth);
 const randomMusic=random(plan.seed),randomTheme=random(plan.characterSeed);
 const theme=Array.from({length:8},(_,i)=>i===7?0:Math.floor(randomTheme()*7));
 const intervals=Array.from({length:8},(_,i)=>i%2===0&&randomTheme()>.72?7:0);
 const rootNote=plan.root||60;
 const events=(plan.resonare?.events||[]).map((e,i)=>({
   ...e,id:i,
   step:clamp(Math.round(Number(e.position)*steps),0,steps-1),
   time:clamp(Math.round(Number(e.position)*steps),0,steps-1)*eighth
 })).sort((a,b)=>a.step-b.step||a.id-b.id);
 // Group competing events in one beat; retain most consequential and recovery.
 const anchors=new Map();
 const cuePriority={recovery:8,stumble:7,danger:7,loss:6,success:5,turn:4,anticipation:3,neutral:0};
 for(const event of events){
  const p=anchors.get(event.step);
  if(!p||cuePriority[event.cue]>cuePriority[p.cue]||
      (cuePriority[event.cue]===cuePriority[p.cue]&&event.tension>p.tension))anchors.set(event.step,event);
 }
 const notes=[],drums=[],rests=[],changes=[],palette={};
 const genre=plan.genre||'pop';
 const normalLead={chip:'chip',piano:'piano',pop:'pluck',fantasy:'bell',
                   ambient:'flute',horror:'ghost'}[genre]||'pluck';
 const dramatic=!!plan.resonare;
 // Opt-in emotion-aware rendition; preserve existing audio when disabled.
 const emotion=plan.emotionComposition===true?plan.emotionPlan?.sections:null;
 const emotionAt=time=>{
   if(!emotion?.length)return null;
   const fraction=time/duration;
   const segment=emotion.find(x=>fraction>=x.start&&fraction<x.end)||emotion[emotion.length-1];
   return segment.target||null;
 };
 const activeSpan=Math.max(6,Math.round(6+plan.bpm/30)); // 1.5–2.5 bars
 function add(time,len,midi,volume,voice,role){
  if(!Number.isFinite(time)||!Number.isFinite(midi)||time>=duration||len<=0)return;
  const t=clamp(time,0,duration),d=Math.min(duration-t,len);
  if(d<.015)return;
  notes.push({t,d,midi:clamp(midi,20,108),volume:clamp(volume,0,.55),voice,role});
  palette[voice]=(palette[voice]||0)+1;
 }
 function drum(time,kind,volume){if(time<duration)drums.push({t:time,kind,volume:clamp(volume,0,1)})}
 function state(step){
  if(!dramatic)return {cue:'neutral',age:1e5,tension:.24,event:null};
  let event=null;
  for(const candidate of anchors.values()){
    if(candidate.step<=step&&(!event||candidate.step>event.step))event=candidate;
  }
  if(!event)return {cue:'neutral',age:1e5,tension:.24,event:null};
  const age=step-event.step;
  if(age>=activeSpan||event.cue==='neutral')
   return {cue:'neutral',age,tension:clamp((event.tension||.24)*.4+.14,.16,.7),event};
  return {cue:event.cue,age,tension:clamp(event.tension||.3,.12,.98),event};
 }
 const expression=[];
 let shiftedChords=0,breaks=0,cadences=0,cueHits=0;
 const progression=Array.isArray(plan.progression)&&plan.progression.length?plan.progression:[0,5,3,4];
 // Plan each bar's harmony and motif role from a 4-bar emotional arc.
 const emotionForm=emotion?Array.from({length:Math.ceil(steps/8)},(_,bar)=>{
  const target=emotionAt(bar*8*eighth)||{},phrase=bar%4;
  const tension=clamp((target.tension||0)*.85+(target.power||0)*.3);
  const grief=clamp((target.sadness||0)*.7+(target.nostalgia||0)*.3);
  const warmth=clamp((target.tenderness||0)*.7+(target.peacefulness||0)*.4);
  const lift=clamp((target.joy||0)*.65+(target.wonder||0)*.3+(target.transcendence||0)*.2);
  const path=tension>.38?[0,3,4,0]:grief>.4?[5,3,4,0]:lift>.35?[0,4,3,0]:[0,3,4,0];
  return {phrase,chord:path[phrase],contour:[0,lift>.3?2:1,tension>.3?3:-2,-1][phrase],tension,grief,warmth,lift,cadence:phrase===3};
 }):null;
 const formAt=step=>emotionForm?.[Math.min(emotionForm.length-1,Math.floor(step/8))]||null;
 // Every two beats a harmony cell can react; baseline retains 4/4 progression.
 function harmonyAt(step){
  const measure=Math.floor(step/8),base=progression[measure%progression.length];
  const s=state(step),bad=['stumble','loss','danger'].includes(s.cue);
  let chord=formAt(step)?.chord??base,alteration=0;
  if(dramatic&&bad){
    chord=s.cue==='stumble'?(base+5)%7:(base+4)%7;
    alteration=s.tension>.35?1:0; // chromatic tension voice
  }else if(dramatic&&s.cue==='recovery'){
    chord=s.age<3?4:0;cadences++;
  }else if(dramatic&&s.cue==='success')chord=0;
  if(dramatic&&chord!==base)shiftedChords++;
  return {chord,base,alteration,s};
 }
 const harmonyCells=Math.ceil(steps/4);
 const harmony=Array.from({length:harmonyCells},(_,cell)=>{
  const at=cell*4, result=harmonyAt(at);
  return {...result,at,t:at*eighth};
 });
 let lastSignature='';
 // Audible silence masks cover even sustained notes from earlier bars.
 for(const event of anchors.values()){
  if(event.cue==='stumble'){
    const start=event.time+eighth*.47,stop=Math.min(duration,start+eighth*1.8);
    rests.push({start,end:stop,cue:'stumble'});breaks++;
  }else if(event.cue==='turn'&&(event.tension||0)>.42){
    const start=event.time+eighth*.22;
    rests.push({start,end:Math.min(duration,start+eighth*.56),cue:'turn'});breaks++;
  }
 }
 for(let i=0;i<steps;i++){
  const time=i*eighth,position=i%8,measure=Math.floor(i/8);
  const cell=harmony[Math.min(harmony.length-1,Math.floor(i/4))];
  const {s,chord,alteration}=cell,live=state(i);
  const onset=anchors.get(i),cue=live.cue;
  const dark=['stumble','loss','danger'].includes(cue);
  const rising=['recovery','success'].includes(cue);
  const quiet=cue==='anticipation'||cue==='turn';
  const emotionTarget=emotionAt(time);
  const expressiveTension=emotionTarget?.tension||0;
  const expressivePeace=emotionTarget?.peacefulness||0;
  const expressiveJoy=emotionTarget?.joy||0;
  const expressiveSadness=emotionTarget?.sadness||0;
  const emotionEnergy=emotionTarget?clamp(1+expressiveJoy*.28+expressiveTension*.20-expressivePeace*.22-expressiveSadness*.16,.6,1.45):1;
  const energy=clamp((dark?.61:rising?.94:quiet?.48:.77)*emotionEnergy,.25,1.25);
  const rootChord=degree(rootNote,scale,chord);
  // A chord is genuinely REHARMONIZED twice per bar in the experimental version.
  if(i%4===0){
   const pad=dark?'ghost':genre==='ambient'?'pad':genre==='piano'?'piano':
               genre==='fantasy'?'pad':'pluck';
   const baseVol=dark?.13:rising?.14:.105;
   const length=Math.min(eighth*(dramatic?3.7:7.2),duration-time);
   const voiced=[0,2,4].map(n=>degree(rootNote,scale,chord+n)-12);
   voiced.forEach((pitch,index)=>add(time+index*.012,length-index*.012,pitch,
       baseVol*(index===0?1:.76),pad,'chord'));
   if(alteration)add(time,eighth*2,rootChord-11,.085,'ghost','tension');
   // Switch bass/harmony with the story, including mid-measure changes.
   add(time,Math.min(eighth*(dark?3.6:2.6),duration-time),
     rootChord-24, (dark?.16:rising?.18:.15)*energy,'bass','bass');
   const signature=chord+':'+alteration;
   if(signature!==lastSignature)changes.push({step:i,time,
     chord,alteration,cue});
   lastSignature=signature;
  }
  const muted=rests.some(rest=>time>=rest.start&&time<rest.end);
  const drop=dark&&(i%4===1||i%4===3);
  // Theme contour is persistent, but the local narrative deforms its phrase.
  if(!muted&&!drop){
   const form=formAt(i);
   const normalRhythm=i%4===0||i%4===2||i%8===3||i%8===7;
   const dramaticRhythm=dark?(i%4===0||i%8===6):
       rising?(i%2===0||i%8===7):quiet?(i%4===0):normalRhythm;
   const feelingRest=emotionTarget && expressivePeace+expressiveSadness>1.05 && position===3;
   const feelingMotion=emotionTarget && expressiveJoy+expressiveTension>1.05 && position===1;
   const phraseRhythm=form?(form.phrase===0?[0,2,5].includes(position):form.phrase===1?[0,3,6].includes(position):form.phrase===2?[0,1,3,5].includes(position):[0,2,4,6].includes(position)):normalRhythm;
   if(!feelingRest&&(form?phraseRhythm:((dramatic?dramaticRhythm:normalRhythm)||feelingMotion))&&!(position===7&&measure%4===3)){
    let di=theme[position]+intervals[position];
    if(position===0||position===4){
      const choices=[chord,chord+2,chord+4];
      di=choices.reduce((a,b)=>Math.abs(b-di)<Math.abs(a-di)?b:a,choices[0]);
    }
    if(measure%4===3&&position>=5)di=position===7?0:Math.max(0,di-1);
    if(dark){di=Math.max(0,di-3-(i%4===0?1:0));}
    if(rising)di+=position%4===2?3:1;
    if(quiet)di=Math.min(5,di);
    if(form){
     const motif=theme[position]+intervals[position];
     di=motif+(form.phrase===2?theme[7-position]-theme[position]:0)+form.contour;
     if(form.cadence&&position>=4)di=position===6?chord+2:chord;
     else if(position===0||position===4)di=chord+(form.tension>.55?1:0);
     if(form.grief>.48&&position>=3)di--;
    }else if(emotionTarget)di+=expressiveTension>.55&&position===2?1:expressivePeace>.55&&position===6?-1:0;
    const octaveShift=genre==='piano'||genre==='ambient'?-12:0;
    const voice=dark?'ghost':rising?(genre==='chip'?'chip':'bell'):normalLead;
    const d=(dark?eighth*1.75:quiet?eighth*2.8:rising?eighth*.97:eighth*1.65)*(emotionTarget?clamp(1+expressivePeace*.3-expressiveTension*.15,.8,1.35):1);
    add(time,d,degree(rootNote,scale,di)+octaveShift,
      (dark?.135:rising?.23:quiet?.105:.18)*energy,voice,'lead');
    if(rising&&position%4===0){
      add(time+eighth*.10,eighth*1.25,
        degree(rootNote,scale,di+2)+octaveShift,.105,'bell','countermelody');
    }
   }
  }
  // Answer the lead in its planned phrase rests rather than doubling its onset.
  const reply=formAt(i);
  const replyStep=reply?[null,2,4,5][reply.phrase]:null;
  if(replyStep===position&&!muted&&!drop){
   add(time+eighth*.10,eighth*(reply.warmth>.45?2.5:1.4),
     degree(rootNote,scale,cell.chord+2)-12,.09,genre==='piano'?'piano':'bell','countermelody');
  }
  // Dynamics/orchestration: muted percussion under threat, full return after victory.
  const rhythmGenre=['chip','pop','fantasy'].includes(genre);
  if(rhythmGenre&&!muted){
   if(dark){
     if(i%8===0)drum(time,'kick',.36);
     if(cue==='danger'&&i%8===4)drum(time,'low',.36);
   }else if(!quiet){
     if(i%4===0)drum(time,'kick',rising?.98:.75);
     if(i%4===2)drum(time,'snare',rising?.70:.53);
     if(rising||i%2===1&&randomMusic()>.40)
       drum(time,'hat',rising?.56:.30);
   }else if(i%8===0)drum(time,'hat',.23);
  }else if(genre==='horror'&&!muted&&i%8===0)drum(time,'low',dark?.7:.3);
  if(onset&&onset.cue!=='neutral'){
    cueHits++;
    if(onset.cue==='stumble'){
     add(time,eighth*.36,degree(rootNote,scale,4)+1,.25,'chip','impact');
     drum(time,'impact',.78);
    }else if(onset.cue==='recovery'){
     add(time,eighth*.98,degree(rootNote,scale,0)+12,.27,'bell','recovery');
    }else if(onset.cue==='success'){
     add(time,eighth*.98,degree(rootNote,scale,4)+12,.23,'bell','success');
    }else if(onset.cue==='danger'||onset.cue==='loss'){
     add(time,eighth*3,degree(rootNote,scale,1)-24,.22,'ghost','threat');
     drum(time,'low',.6);
    }else if(onset.cue==='turn')drum(time,'impact',.36);
  }
  expression.push({step:i,t:time,cue,energy,harmony:chord});
 }
 // A definite closing chord after story resolution or sustained tension.
 const tail=Math.max(0,duration-eighth*2.8);
 const endState=state(Math.max(0,steps-1));
 const endingDark=['danger','loss','stumble'].includes(endState.cue);
 const endingChord=endingDark?5:0;
 for(const offset of [0,2,4])
  add(tail,Math.min(duration-tail,eighth*2.4),
    degree(rootNote,scale,endingChord+offset)-12,.12,'pad','ending');
 // Sort makes score inspectable and comparable in tests.
 notes.sort((a,b)=>a.t-b.t);
 drums.sort((a,b)=>a.t-b.t);
 return {duration,bpm:plan.bpm,sampleRate:RATE,theme,notes,drums,rests,
  harmony,changes,expression,genre,dramatic,
  details:{
   emotionComposition:!!emotion,emotionForm:emotionForm?emotionForm.map(({phrase,chord,contour,cadence})=>({phrase,chord,contour,cadence})):null,emotionSections:emotion?emotion.map(x=>({id:x.id,start:x.start,end:x.end,target:x.target})):null,
   theme,genre,mode:plan.mode,bpm:plan.bpm,dramatic,
   melodyNotes:notes.filter(n=>n.role==='lead').length,
   accompanimentNotes:notes.filter(n=>n.role==='chord').length,
   bassNotes:notes.filter(n=>n.role==='bass').length,
   counterMelodyNotes:notes.filter(n=>n.role==='countermelody').length,
   percussionHits:drums.length,breaks,shiftedChords,
   cueHits,cues:events.map(e=>e.cue),
   harmonyChanges:changes.length,
   palette,events:events.map(e=>({cue:e.cue,t:e.time,step:e.step,tension:e.tension})),
   rests:rests.map(r=>({...r})),harmonies:harmony.map(h=>({t:h.t,chord:h.chord,alteration:h.alteration}))
  }};
}
function sound(kind,phase,secs){
 const p=phase-Math.floor(phase);
 switch(kind){
  case 'chip':return (p<.5?.64:-.64)+.12*Math.sin(PI2*phase);
  case 'piano':return .66*Math.sin(PI2*phase)+.22*Math.sin(PI2*2*phase)+.07*Math.sin(PI2*3*phase);
  case 'pluck':return .65*Math.sin(PI2*phase)+.23*Math.sin(PI2*2*phase)+.09*Math.sin(PI2*3*phase);
  case 'bell':return .66*Math.sin(PI2*phase)+.20*Math.sin(PI2*2.014*phase)+.08*Math.sin(PI2*3.97*phase);
  case 'flute':return .85*Math.sin(PI2*phase)+.08*Math.sin(PI2*2*phase);
  case 'ghost':return .63*Math.sin(PI2*phase)+.24*Math.sin(PI2*1.008*phase);
  case 'pad':return .58*Math.sin(PI2*phase)+.18*Math.sin(PI2*.997*phase);
  case 'bass':return .72*Math.sin(PI2*phase)+.13*Math.sin(PI2*2*phase);
  default:return Math.sin(PI2*phase);
 }
}
function render(plan){
 const score=buildScore(plan),N=Math.ceil((score.duration+.17)*RATE),samples=new Float32Array(N),r=random(plan.seed^0x492fd23);
 for(const note of score.notes){
  const begin=Math.floor(note.t*RATE);
  const count=Math.min(Math.floor(note.d*RATE),N-begin);
  const hz=440*Math.pow(2,(note.midi-69)/12);
  const attack=note.voice==='pad'||note.voice==='ghost'?.060:.008;
  const release=note.voice==='pad'?.22:.055;
  const decay=note.voice==='piano'?1.9:note.voice==='bell'?1.2:note.voice==='pluck'?1.0:note.voice==='bass'?.40:.18;
  for(let i=0;i<count;i++){
   const x=i/RATE,env=Math.min(1,x/attack,Math.max(0,(note.d-x)/release))*Math.exp(-x*decay);
   samples[begin+i]+=sound(note.voice,hz*x,x)*env*note.volume;
  }
 }
 for(const drum of score.drums){
  const start=Math.floor(drum.t*RATE);
  const length=Math.min(N-start,Math.round(RATE*(drum.kind==='kick'?.24:.15)));
  for(let i=0;i<length;i++){
   const x=i/RATE,z=r()*2-1;
   const value=drum.kind==='kick'?Math.sin(PI2*(79*x-93*x*x))*Math.exp(-x*30):
      drum.kind==='low'?Math.sin(PI2*(53*x-25*x*x))*Math.exp(-x*18):
      drum.kind==='impact'?z*Math.exp(-x*35)+Math.sin(PI2*48*x)*Math.exp(-x*20):
      z*Math.exp(-x*(drum.kind==='hat'?125:42));
   samples[start+i]+=value*drum.volume*(drum.kind==='hat'?.042:drum.kind==='snare'?.09:.13);
  }
 }
 // Audible cuts happen AFTER sustained instruments, not just newly started notes.
 for(const rest of score.rests){
  const from=clamp(Math.round(rest.start*RATE),0,N),to=clamp(Math.round(rest.end*RATE),0,N);
  const taper=Math.round(RATE*.014);
  for(let i=from;i<to;i++){
   const fade=Math.min(1,(i-from)/taper,(to-i)/taper);
   samples[i]*=1-clamp(fade,0,1)*.985;
  }
 }
 // Short, stable room reflection follows arranged cut; keeps the beat audible.
 const a=Math.round(RATE*.135),b=Math.round(RATE*.267);
 for(let i=b;i<N;i++)samples[i]+=.08*samples[i-a]+.045*samples[i-b];
 let peak=0;
 for(let i=0;i<N;i++)peak=Math.max(peak,Math.abs(samples[i]));
 const gain=Math.min(1.8,.78/Math.max(peak,.08));
 for(let i=0;i<N;i++){
  const ending=clamp((score.duration-i/RATE)/.31,0,1);
  samples[i]=Math.tanh(samples[i]*gain)*ending;
 }
 return {samples,sampleRate:RATE,details:score.details,score};
}
function wavBlob(samples,rate=RATE){
 const bytes=new ArrayBuffer(44+samples.length*2),v=new DataView(bytes);
 const str=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i));};
 str(0,'RIFF');v.setUint32(4,36+samples.length*2,true);
 str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);
 v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);
 v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);
 str(36,'data');v.setUint32(40,samples.length*2,true);
 for(let i=0;i<samples.length;i++)v.setInt16(44+i*2,
  Math.round(clamp(samples[i],-1,1)*32767),true);
 return new Blob([bytes],{type:'audio/wav'});
}
root.PlotuneComposerV4={buildScore,render,wavBlob};
})(window);
