/* Plotune music psychology mapping v0.1.
 Research-informed directional cues (tempo, articulation, dissonance, space);
 character mappings are creative hypotheses, not scientific personality diagnoses. */
(function(root){'use strict';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
function has(field,value){const v=field?.value;return Array.isArray(v)?v.includes(value):v===value;}
function derive(structure,style){
 const c=structure?.character||{},w=structure?.world||{},s=structure?.scene||{};
 const small=has(c.body,'small'),bouncy=has(c.motion,'bouncy')||has(c.stableTraits,'lively');
 const quiet=has(c.stableTraits,'timid')||has(c.speech,'quiet')||has(c.decision,'careful');
 const grievous=has(s.stakes,'severe');
 const mild=has(s.stakes,'minor')&&!grievous;
 const place=has(w.location,'room')?'indoor':has(w.location,'forest')?'forest':'unspecified';
 const space=has(w.scale,'large')?.36:place==='indoor'?.06:place==='forest'?.18:.10;
 return {version:'0.1',evidence:{research:['tempo-arousal','articulation','dissonance-tension','reverberation-space'],hypotheses:['body-to-motif','behavior-to-rhythm']},
  motif:{bounce:clamp((bouncy?.52:0)+(small?.18:0)),hesitation:quiet?.48:.06,register:small?2:0},
  emotion:{grief:grievous,mildSadness:mild,accent:grievous?.48:mild?.12:.24},
  space:{reverb:space,place},
  // Eerola, Friberg & Bresin 2013: mode, tempo, register, dynamics,
  // articulation and timbre each affect perceived emotion. These coefficients
  // are application design choices, NOT published fitted coefficients.
  researchCues:(()=>{
   const sad=style==='sadness',fear=style==='fear'||style==='terror',joy=style==='joy'||style==='fun';
   return {source:'Eerola-Friberg-Bresin-2013',
    mode:sad?'gentle-major-with-sigh':fear?'minor':joy?'major':'preserve',
    tempoFactor:sad?.92:fear?1.06:joy?1.05:1,
    registerSemitones:sad?-1:fear?-2:joy?1:0,
    dynamicsFactor:sad?.84:fear?.9:joy?1.06:1,
    articulationFactor:sad?1.20:fear?.80:joy?.92:1,
    brightness:sad?.70:fear?.6:joy?1:.85,
    // Spatial perception: relative reflected/direct energy is a distance cue;
    // amount selected from location is a creative mapping, not a measured law.
    reverbWet:clamp(space*.45,.02,.19)};
  })(),
  orchestration:{family:has(w.technology,'digital')?'synthlead':has(w.magicSystem,'magic')?'ocarina':has(w.materials,'wood')?'kalimba':quiet?'softpiano':null},
  theoryNote:'Research trends are directional; character-to-sound associations are hypotheses'};
}
root.PlotuneMusicPsychology={derive};
})(window);