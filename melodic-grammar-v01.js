/* Plotune melodic grammar v0.1: seeded, weighted transitions, no fixed contour.
 * Character cues influence behavior; world constrains mode/scale; scene alters phrasing.
 * Personality associations are creative hypotheses, not validated psychological classifiers. */
(function(root){'use strict';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function hash(text){let x=2166136261;for(const c of String(text||'')){x^=c.codePointAt(0);x=Math.imul(x,16777619)}return x>>>0}
function rng(seed){let x=seed>>>0;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296}}
function has(node,v){return Array.isArray(node?.value)?node.value.includes(v):node?.value===v}
function normalize(weights){const s=weights.reduce((a,b)=>a+b,0);return weights.map(x=>x/s)}
function sample(options,weights,rand){const p=normalize(weights),r=rand();let sum=0;for(let i=0;i<options.length;i++){sum+=p[i];if(r<sum)return options[i]}return options[options.length-1]}
function grammar(structure,expression,seed=1){
 const c=structure?.character||{},w=structure?.world||{},s=structure?.scene||{},m=expression?.motif||{};
 const curiosity=has(c.attention,'curious')?1:0;
 const persistent=has(c.values,'competitive')?1:0;
 const calm=has(c.stableTraits,'timid')||has(c.decision,'careful')?1:0;
 const motion=has(c.motion,'bouncy')||has(c.stableTraits,'lively')?1:0;
 const bounce=clamp(Math.max(m.bounce||0,motion*.65));
 const hesitation=clamp(Math.max(m.hesitation||0,calm*.58));
 const identity=hash((c.themeIdentity?.value||'')+'|'+seed);
 const choices=[-4,-3,-2,-1,0,1,2,3,4];
 const weights=choices.map(v=>{
   const a=Math.abs(v);
   let weight=a===0?1.1:a===1?2.8:a===2?1.6:a===3?.65:.3;
   if(a>=3)weight*=1+bounce*3.0;
   if(a===1)weight*=1+hesitation*.8;
   if(a===0)weight*=1+hesitation*.9+persistent*.3;
   if(v>0)weight*=1+curiosity*.32;
   return weight;
 });
 const world={mode:has(w.magicSystem,'magic')?'modal':has(w.period,'edo')?'pentatonic':'diatonic',
   space:expression?.space?.place||'unspecified'};
 return {identity,choices,weights,bounce,hesitation,curiosity,persistent,world,
   noteDensity:clamp(.64+bounce*.24-hesitation*.34,.25,.95),
   phraseLength:Math.round(clamp(6+bounce*1.7-hesitation*2.8,3,9))};
}
function phrase(g,bar,count=8){
 const r=rng((g.identity^Math.imul(bar+1,0x9e3779b9))>>>0);
 const result=[];let degree=2+Math.floor(r()*3),direction=1;
 for(let i=0;i<count;i++){
   // Long-form direction alternates by section; local direction responds to previous step.
   const section=bar%4,trend=section===0?1:section===1?-1:section===2?1:-1;
   const opts=g.choices.filter(d=>degree+d>=0&&degree+d<=8);
   const weights=opts.map(d=>{
     let weight=g.weights[g.choices.indexOf(d)];
     if(d!==0&&Math.sign(d)===trend)weight*=1.33;
     if(d!==0&&Math.sign(d)!==direction)weight*=1+g.curiosity*.5;
     if(i===count-1&&d<0)weight*=1.4;
     return weight;
   });
   const step=sample(opts,weights,r);
   degree+=step;if(step!==0)direction=Math.sign(step);
   const rest=r()>g.noteDensity;
   const length=g.hesitation>.4&&r()>.55?2.8:g.bounce>.45&&r()>.45?.75:1.4;
   result.push({degree,rest,durationUnits:length,step});
 }
 return result;
}

// Shared phrase planner: rhythmic events occupy a whole bar, not fixed note slots.
// Reuses the same character/world grammar for game, character, box and flute voices.
function composePhrase(g,bar,options={}){
 const r=rng((g.identity^Math.imul((bar%4)+1,0x9e3779b9)^Math.imul(Math.floor(bar/4)+1,0x85ebca6b))>>>0);
 const density=clamp(options.density??g.noteDensity,.22,.95);
 const slots=16,events=[];
 const count=Math.max(3,Math.min(11,Math.round(3+density*7+(r()-.5)*2)));
 const raw=phrase(g,bar,count);
 let position=bar%4===1&&g.hesitation>.3?1:0;
 const base=bar%4===0?0:bar%4===1?1:bar%4===2?2:0;
 for(let i=0;i<count&&position<slots-.25;i++){
   const remaining=slots-position;
   const tail=count-i;
   const spacing=Math.min(remaining,Math.max(.75,remaining/tail*(.7+r()*.55)));
   const note=raw[i];
   const cadence=i===count-1&&bar%4===3;
   const next=Math.min(slots,position+spacing);
   const duration=Math.max(.45,Math.min(next-position,spacing*(.55+r()*.4)+(cadence?1.25:0)));
   events.push({position:+position.toFixed(3),durationUnits:+Math.min(duration,slots-position).toFixed(3),
     degree:cadence?base:Math.max(0,Math.min(8,note.degree+(bar%4===2?1:0))),
     rest:note.rest&&!cadence,step:note.step,cadence});
   position=next+(r()<.18?.5:0);
 }
 // Four-bar motif memory: the first phrase supplies an identity, later stages
 // transform its rhythm and intervals rather than inventing unrelated notes.
 if(options.motif&&options.motif.length){
  const stage=options.stage||'development';
  for(let i=0;i<events.length;i++){
   const source=options.motif[i%options.motif.length];
   const offset=stage==='climax'?(i%3===0?2:1):stage==='resolution'?-1:0;
   events[i].degree=Math.max(0,Math.min(8,source.degree+offset));
   if(stage==='resolution'&&i===events.length-1){
    events[i].degree=0;events[i].rest=false;events[i].cadence=true;
   }
   if(stage==='development'&&i%3===1)events[i].durationUnits=Math.min(events[i].durationUnits*1.2,16-events[i].position);
  }
 }
 // Phase 2 is explicitly opt-in. Keep the original bar generator untouched otherwise.
 if(options.motifIdentity){
  const planner=root.PlotuneMotifPlanner;
  if(!planner)throw new Error('PlotuneMotifPlanner is required for motifIdentity');
  const identity=options.motifIdentity;
  const kind=options.motifTransform||'variation';
  const transformed=planner.transform(identity,kind).events;
  // Preserve the original generator's per-bar cadence metadata, while
  // restoring an audible closing anchor for the return section.
  return transformed.map((event,i)=>({
   ...event,
   step:i?event.degree-transformed[i-1].degree:0,
   cadence:kind==='return'&&i===transformed.length-1
  }));
 }
 if(events.length&&!events.some(n=>!n.rest))events[0].rest=false;
 return events;
}
root.PlotuneMelodicGrammar={grammar,phrase,composePhrase};
})(window);