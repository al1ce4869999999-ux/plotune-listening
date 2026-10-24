/* M3: deterministic joint chord/phrase planning. Opt-in, no direct renderer mutation. */
(function(root){'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mod=x=>(x%7+7)%7;
const triad=[0,2,4];
const distance=(a,b)=>{const d=Math.abs(mod(a)-mod(b));return Math.min(d,7-d)};
function phraseFit(events,chord,tension){
 let sum=0,weight=0;
 for(const e of events){
  if(e.rest)continue;
  const strong=e.position%4<.6?2.5:e.position%2<.5?1.5:1;
  const closest=Math.min(...triad.map(d=>distance(e.degree+chord,chord+d)));
  const passing=closest===1&&strong<2;
  sum+=strong*(closest===0?1.2:passing?.2:-.9*closest)*(1-.3*tension);
  weight+=strong;
 }
 return weight?sum/weight:-3;
}
function voiceLeading(chord,prev){
 if(prev==null)return 0;
 const from=triad.map(d=>prev+d),to=triad.map(d=>chord+d);
 return to.reduce((sum,n)=>sum+Math.min(...from.map(p=>distance(n,p))),0)/3;
}
function refine(events,chord,tension,close){
 return events.map((e,i)=>{
  const out={...e};
  if(e.rest)return out;
  // Strong beats are guided to harmony; weak beats retain passing motion.
  const accented=e.position%4<.6;
  if(accented&&tension<.78&&distance(e.degree,0)>0){
   const choices=triad.map(x=>x+7*Math.floor(e.degree/7)).flatMap(x=>[x-7,x,x+7]).filter(x=>x>=0&&x<=8);
   if(choices.length)out.degree=choices.reduce((a,b)=>Math.abs(b-e.degree)<Math.abs(a-e.degree)?b:a);
  }
  if(close&&i===events.length-1&&!out.rest){out.degree=0;out.cadence=true;}
  return out;
 });
}
function plan(phrases,options={}){
 if(!Array.isArray(phrases)||!phrases.length||phrases.some(p=>!Array.isArray(p)||!p.length))
  throw new TypeError('phrase bars required');
 const original=Array.isArray(options.progression)&&options.progression.length?options.progression:[0,4,5,3];
 const tension=clamp(Number(options.tension)||0,0,1);
 const chords=[],events=[],decisions=[];
 const pool=[0,1,2,3,4,5,6];
 for(let b=0;b<phrases.length;b++){
  const previous=b?chords[b-1]:null;
  const isCadence=b===phrases.length-1;
  const expected=mod(original[b%original.length]);
  const candidates=isCadence?[0]:pool;
  const graded=candidates.map(chord=>{
   const adapted=refine(phrases[b],chord,tension,isCadence);
   const fit=phraseFit(adapted,chord,tension);
   const motion=voiceLeading(chord,previous);
   // Prefer contextual progression rather than an identical chord every bar.
   const repeat=previous===chord&&b>0?.46:0;
   const home=chord===expected?.62:0;
   const cadencePrep=b===phrases.length-2&&chord===4?.38:0;
   const score=fit*1.5-motion*.19-repeat+home+cadencePrep;
   return {chord,events:adapted,score,fit,motion};
  }).sort((a,b)=>b.score-a.score||a.chord-b.chord);
  const chosen=graded[0];
  chords.push(chosen.chord);events.push(chosen.events);
  decisions.push({bar:b,chord:chosen.chord,score:chosen.score,fit:chosen.fit,previous});
 }
 return {chords,phrases:events,decisions};
}
root.PlotuneM3Harmony={plan,phraseFit,voiceLeading};
})(window);
