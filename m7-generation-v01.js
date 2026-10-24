/* M7.1: four-condition generation contract. No playback/UI changes. */
(function(root){'use strict';
const IDS=Object.freeze(['baseline','phase','m','phase-m']);
const FLAG_KEYS=Object.freeze(['motifDevelopment','musicDevelopment','musicHarmony','musicVoices','musicPerformance']);
function condition(id){
 if(!IDS.includes(id))throw new RangeError('unknown M7 condition: '+id);
 const phase=id==='phase'||id==='phase-m',m=id==='m'||id==='phase-m';
 return Object.freeze({id,phase,m,m6Repair:false,flags:Object.freeze({
  motifDevelopment:phase,musicDevelopment:m,musicHarmony:m,musicVoices:m,musicPerformance:m
 })});
}
function request(input,seed){
 if(!input||typeof input!=='object')throw new TypeError('M7 input required');
 const duration=Number(input.duration??input.durationSec);
 if(![15,30,60].includes(duration))throw new RangeError('M7 duration must be 15, 30 or 60 seconds');
 if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError('invalid generation seed');
 if(typeof input.scene!=='string'||!input.scene.trim())throw new TypeError('scene required');
 const style=input.style??'handheld';
 if(input.instrumentSet!=null&&input.instrumentSet!=='handheld-current')throw new RangeError('unsupported M7 instrument set');
 if(style!=='handheld')throw new RangeError('M7.1 currently supports handheld only');
 return Object.freeze({title:String(input.title??''),character:String(input.character??''),
  world:String(input.world??''),scene:input.scene,style,gameStyle:String(input.gameStyle??'auto'),
  duration,seed:seed>>>0,instrumentSet:String(input.instrumentSet??'handheld-current')});
}
function dependenciesFromRoot(){
 const required=['PlotuneAnalysis','PlotuneResonare','PlotuneHandheld','PlotuneStoryStructure','PlotuneMusicPsychology',
  'PlotuneMelodicGrammar','PlotuneMotifPlanner','PlotuneM2Phrase','PlotuneM3Harmony','PlotuneM4Voices','PlotuneM5Performance'];
 for(const name of required)if(!root[name])throw new TypeError('M7 engine dependency missing: '+name);
 return {analyze:root.PlotuneAnalysis.analyze,plan:root.PlotuneAnalysis.plan,
  resonare:root.PlotuneResonare.analyze,handheld:root.PlotuneHandheld,
  structure:root.PlotuneStoryStructure.analyze,psychology:root.PlotuneMusicPsychology.derive};
}
// Prepared plans contain plain data. Isolate nested state between conditions and renders.
function clone(value){
 if(Array.isArray(value))return value.map(clone);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,clone(v)]));
 return value;
}
function makePlans(req,dependencies){
 const {analyze,plan,resonare,handheld,structure,psychology}=dependencies||{};
 if(!analyze||!plan||!resonare||!handheld?.prepare)throw new TypeError('M7 analysis dependencies required');
 const input={...req,duration:String(req.duration)};
 const analyzed=analyze(input);
 const original=plan(input,analyzed,0);
 const appraisal=resonare(input);
 const storyContext=[req.character,req.world,req.scene].filter(Boolean).join('\n');
 const shared=handheld.prepare({...original,seed:req.seed,characterSeed:req.seed,duration:req.duration},
  req.gameStyle,appraisal,false,req.scene,storyContext);
 const story=structure?.(input);
 const base={...shared,structure:story,expression:psychology?.(story,req.gameStyle)};
 return IDS.map(id=>{
  const config=condition(id);
  const flags=Object.fromEntries(FLAG_KEYS.map(k=>[k,config.flags[k]]));
  return {conditionId:id,config,plan:{...clone(base),...flags,m6Repair:false,seed:req.seed,characterSeed:req.seed,duration:req.duration}};
 });
}
function generate(input,seed,dependencies){
 dependencies=dependencies||dependenciesFromRoot();
 const req=request(input,seed);
 const plans=makePlans(req,dependencies);
 if(typeof dependencies.handheld.render!=='function')throw new TypeError('M7 renderer required');
 const tracks=plans.map(({conditionId,config,plan})=>{
  const track=dependencies.handheld.render(plan);
  if(!track||!track.samples||!track.score||!Number.isFinite(track.sampleRate))throw new TypeError('invalid M7 rendered track: '+conditionId);
  if(track.samples.length!==Math.round(req.duration*track.sampleRate))throw new RangeError('M7 duration mismatch: '+conditionId);
  if(!track.samples.length||!track.samples.every(Number.isFinite))throw new RangeError('invalid M7 samples: '+conditionId);
  return {conditionId,config,request:req,track};
 });
 return {schemaVersion:'m7.1-v1',request:req,tracks};
}
root.PlotuneM7Generation={IDS,condition,request,makePlans,generate,dependenciesFromRoot};
})(typeof window!=='undefined'?window:globalThis);
